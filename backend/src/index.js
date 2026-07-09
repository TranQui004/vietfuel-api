import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import {
  getFuelPrices, getCacheStats, updateFuelPrices, deleteFuelPrices,
  getProvincePrice, updateProvincePrice, getProvinceCacheStats
} from './cache.js';

import {
  DISCLAIMER, SOURCES,
  setCacheHeaders, sortPrices, enrichMeta,
  notReady, buildResponse, buildDefaultPrices
} from './utils/fuel-helpers.js';

import PROVINCES from './data/provinces.json' with { type: "json" };
import scrapers from './scraper.js';

const app = new Hono();

app.use('*', cors());
app.use('*', secureHeaders());

// ── [BẢO MẬT 1] Block request payload quá lớn (chống DoS) ─────
app.use('/api/*', async (c, next) => {
  const ct = c.req.header('Content-Type') || '';
  const cl = parseInt(c.req.header('Content-Length') || '0', 10);
  // Nếu payload > 4KB → reject
  if (cl > 4096) {
    return c.json({ success: false, error: { code: 413, message: 'Payload Too Large.' } }, 413);
  }
  // Chỉ cho phép GET/HEAD/OPTIONS
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    return c.json({ success: false, error: { code: 405, message: 'Method Not Allowed.' } }, 405, {
      Allow: 'GET, HEAD, OPTIONS',
    });
  }
  return next();
});

// ── [BẢO MẬT 2] Bot/spam filter dựa trên User-Agent ─────────────────────────
const BLOCKED_UA_PATTERNS = [
  /masscan/i, /zgrab/i, /nuclei/i, /sqlmap/i, /nikto/i,
  /dirbuster/i, /gobuster/i, /hydra/i, /metasploit/i,
  /\bscanner\b/i, /\bexploit\b/i, /\bfuzz/i,
];
app.use('/api/*', async (c, next) => {
  const ua = c.req.header('User-Agent') || '';
  if (BLOCKED_UA_PATTERNS.some((p) => p.test(ua))) {
    return c.json({ success: false, error: { code: 403, message: 'Forbidden.' } }, 403);
  }
  return next();
});

// ── [BẢO MẶT 3] Header bảo mật bổ sung cho /api/* ───────────────────────────
app.use('/api/*', async (c, next) => {
  await next();
  // Không cho index /api/* trong search engine
  c.header('X-Robots-Tag', 'noindex, nofollow');
  // Bảo vệ khỏi MIME sniffing attack
  c.header('X-Content-Type-Options', 'nosniff');
  // Không cho nhúng API trong iframe
  c.header('X-Frame-Options', 'DENY');
  // Giới hạn thông tin Referrer
  c.header('Referrer-Policy', 'no-referrer');
});

// ── [BẢO MẬT 4] Rate Limiting (Nên sử dụng WAF thay vì KV) ───────────────

// ── [TỐI ƯU HÓA] Cache Stampede Protection ─────────────────────────────
const pendingScrapes = new Map();

async function deduplicatedScrape(key, scrapeFn, env, SOURCES) {
  const kv = env.FUEL_CACHE;
  const db = env.DB;
  if (pendingScrapes.has(key)) {
    console.log(`[Unified-OnDemand] Tái sử dụng tiến trình cào đang chạy cho: ${key}`);
    return pendingScrapes.get(key);
  }

  const promise = (async () => {
    try {
      const fresh = await scrapeFn();

      // Ghi cache (KV / Memory)
      await updateFuelPrices(kv, key, fresh);

      // Ghi lịch sử (D1 / SQLite)
      if (db) {
        // Dynamic import to avoid breaking if db layer isn't needed
        import('./db/repository.js').then(({ insertFuelPricesHistory }) => {
          insertFuelPricesHistory(db, key, fresh).catch(console.error);
        });
      }

      // Clone cho các mirrors của Petrolimex
      if (key === 'petrolimex') {
        const mirrors = ['kv2_petrolimex', 'saigon_petrolimex', 'vungtau_petrolimex'];
        await Promise.all(mirrors.map(mk => {
          const mirrorData = { ...fresh, scrapedAt: new Date().toISOString(), source: SOURCES[mk]?.label || mk };
          return Promise.all([
            updateFuelPrices(kv, mk, mirrorData),
            db ? import('./db/repository.js').then(({ insertFuelPricesHistory }) => insertFuelPricesHistory(db, mk, mirrorData).catch(console.error)) : Promise.resolve()
          ]);
        }));
        console.log('[Unified-OnDemand] Petrolimex + 3 mirrors đã được populate.');
      }
      return fresh;
    } finally {
      pendingScrapes.delete(key);
    }
  })();

  pendingScrapes.set(key, promise);
  return promise;
}

// [GET] /api/health
app.get('/api/health', async (c) => {
  const kv = c.env.FUEL_CACHE;
  const sourceStats = {};
  let allHealthy = true;

  for (const src of Object.keys(SOURCES)) {
    const s = await getCacheStats(kv, src);
    sourceStats[src] = {
      label: SOURCES[src].label,
      populated: s.hit,
      scrapedAt: s.scrapedAt,
      ttlRemainingSeconds: s.ttlRemaining,
    };
    if (!s.hit) allHealthy = false;
  }

  const status = allHealthy ? 'healthy' : 'degraded';
  c.header('Cache-Control', 'no-store');

  const storageInfo = {
    cacheType: kv && kv.constructor.name === 'MemoryKV' ? 'Local File (cache.json)' : 'Cloudflare KV Namespace (FUEL_CACHE)',
    dbType: c.env.DB ? (c.env.DB.constructor.name === 'Database' ? 'Local File (backend/data/history.db)' : 'Cloudflare D1 Database (vietfuel-history)') : 'Not Configured'
  };

  return c.json({
    success: true, status,
    sources: sourceStats,
    storage: storageInfo,
    endpoints: {
      nationalSources: Object.keys(SOURCES),
      provinceCount: PROVINCES.length,
      apiVersion: '3.0 (Serverless)',
    },
    timestamp: new Date().toISOString(),
  });
});

// [GET] /api/fuel-prices
app.get('/api/fuel-prices', async (c) => {
  const kv = c.env.FUEL_CACHE;

  // [ON-DEMAND PREFILL] Nếu các nguồn chính chưa có trong KV, scrape ngay để bảng so sánh hiển thị đủ.
  // Ưu tiên Petrolimex trước (nguồn chính) rồi mới song song các nguồn còn lại.

  const checkMissing = async (key) => {
    const d = await getFuelPrices(kv, key);
    return (!d || !d.prices || d.prices.length === 0) ? key : null;
  };

  // [BƯỚC 1] Scrape Petrolimex trước để đảm bảo mirror + primaryKey đúng
  const petrolimexMissing = await checkMissing('petrolimex');
  if (petrolimexMissing) {
    try {
      await deduplicatedScrape('petrolimex', scrapers.scrapePetrolimex, c.env, SOURCES);
    } catch (e) {
      console.error('[Unified-OnDemand] Lỗi Petrolimex:', e.message);
    }
  }

  // [BƯỚC 2] Song song các nguồn còn lại
  const SECONDARY_SOURCES = [
    ['pvoil', scrapers.scrapePVOil],
    ['mipec', scrapers.scrapeMipec],
    ['saigonpetro', scrapers.scrapeSaigonPetro],
    ['comeco', scrapers.scrapeComeco],
    ['petrotimes', scrapers.scrapePetrotimes],
    ['webgia', scrapers.scrapeWebGia],
    ['giaxanghomnay', scrapers.scrapeGiaxanghomnay],
  ];

  const missingSecondary = (await Promise.all(SECONDARY_SOURCES.map(([k]) => checkMissing(k))))
    .filter(Boolean);

  if (missingSecondary.length > 0) {
    await Promise.allSettled(
      SECONDARY_SOURCES
        .filter(([key]) => missingSecondary.includes(key))
        .map(async ([key, fn]) => {
          try {
            await deduplicatedScrape(key, fn, c.env, SOURCES);
          } catch (e) {
            console.error(`[Unified-OnDemand] Lỗi ${key}:`, e.message);
          }
        })
    );
  }

  const defaultData = await buildDefaultPrices(kv);
  if (!defaultData) return notReady(c);

  const { prices, primarySourceKey, dataSources, sourceCount,
    priceDate, scrapedAt, cacheHit, ttlRemaining } = defaultData;

  let priceDateDisplay = null;
  if (priceDate) {
    const [y, m, d] = priceDate.split('-');
    priceDateDisplay = d && m && y ? `${d}/${m}/${y}` : priceDate;
  }

  setCacheHeaders(c, Math.min(ttlRemaining, 3600));
  return c.json({
    success: true, status: 'ok', disclaimer: DISCLAIMER,
    meta: {
      // [UNIFIED] Không trả về primarySourceUrl vì đây là dữ liệu tổng hợp, không đại diện một nguồn nào cụ thể.
      primarySourceId: primarySourceKey,
      primarySource: SOURCES[primarySourceKey]?.label || primarySourceKey,
      primarySourceUrl: null,
      dataSources, sourceCount,
      scrapedAt, priceDate, priceDateDisplay,
      cacheHit, cacheTtlRemainingSeconds: ttlRemaining, totalItems: prices.length,
    },
    data: prices,
  });
});

// [GET] /api/fuel-prices/province/:slug
app.get('/api/fuel-prices/province/:slug', async (c) => {
  const kv = c.env.FUEL_CACHE;
  const slug = c.req.param('slug').toLowerCase().trim();
  const province = PROVINCES.find((p) => p.slug === slug);

  if (!province) {
    c.header('Cache-Control', 'no-store');
    return c.json({
      success: false, status: 'not_found',
      message: { vi: `Không tìm thấy tỉnh "${slug}".`, en: `Province "${slug}" not found.` },
    }, 404);
  }

  const cached = await getProvincePrice(kv, slug);
  const stats = await getProvinceCacheStats(kv, slug);

  if (cached) {
    const sorted = sortPrices(cached.prices);
    const ttl = stats.ttlRemaining || 3600;
    setCacheHeaders(c, ttl);
    return c.json({
      success: true, status: 'ok', disclaimer: DISCLAIMER,
      meta: {
        province: province.name, slug, region: province.region,
        source: 'GiaXangHomNay', sourceUrl: `https://giaxanghomnay.com/tinh-tp/${slug}`,
        ...enrichMeta(cached),
        cacheHit: true, cacheTtlRemainingSeconds: ttl, totalItems: sorted.length,
      },
      data: sorted,
    });
  }

  try {
    c.header('Cache-Control', 'no-store');
    const data = await scrapers.scrapeProvincePrice(slug);
    await updateProvincePrice(kv, slug, data);
    const sorted = sortPrices(data.prices);

    return c.json({
      success: true, status: 'ok', disclaimer: DISCLAIMER,
      meta: {
        province: data.provinceName || province.name, slug, region: data.region || province.region,
        source: 'GiaXangHomNay', sourceUrl: `https://giaxanghomnay.com/tinh-tp/${slug}`,
        ...enrichMeta(data),
        cacheHit: false, cacheTtlRemainingSeconds: 3600, totalItems: sorted.length,
      },
      data: sorted,
    });
  } catch (e) {
    return c.json({
      success: false, status: 'scrape_error',
      message: { vi: 'Lỗi lấy dữ liệu', en: 'Fetch error' }
    }, 502);
  }
});

// [GET] /api/fuel-prices/:source
app.get('/api/fuel-prices/:source', async (c) => {
  const kv = c.env.FUEL_CACHE;
  const source = c.req.param('source').toLowerCase();

  if (!SOURCES[source]) {
    c.header('Cache-Control', 'no-store');
    return c.json({
      success: false, status: 'invalid_source',
      message: { vi: 'Nguồn không hợp lệ.', en: 'Invalid source.' },
      availableSources: Object.entries(SOURCES).map(([k, v]) => ({ id: k, label: v.label, url: v.url })),
    }, 400);
  }

  // ?refresh=1 — xóa cache, force re-scrape ngay lập tức
  const forceRefresh = c.req.query('refresh') === '1';
  if (forceRefresh) await deleteFuelPrices(kv, source);

  let data = await getFuelPrices(kv, source);
  let stats = await getCacheStats(kv, source);

  // [ON-DEMAND] Fallback cho TẤT CẢ các nguồn nếu cache trống hoặc quá hạn
  if (!data || stats.isStale || forceRefresh) {
    try {
      let fresh;
      // 3 mirror Petrolimex: clone dữ liệu gốc từ Petrolimex
      if (['kv2_petrolimex', 'saigon_petrolimex', 'vungtau_petrolimex'].includes(source)) {
        // Lấy data từ Petrolimex cache trước, nếu không có thì scrape
        let petrolimexData = await getFuelPrices(kv, 'petrolimex');
        if (!petrolimexData) petrolimexData = await scrapers.scrapePetrolimex();
        if (petrolimexData) {
          fresh = {
            ...petrolimexData,
            source: SOURCES[source]?.label || source,
            scrapedAt: new Date().toISOString(),
          };
        }
      } else if (source === 'petrolimex') fresh = await scrapers.scrapePetrolimex();
      else if (source === 'pvoil') fresh = await scrapers.scrapePVOil();
      else if (source === 'mipec') fresh = await scrapers.scrapeMipec();
      else if (source === 'giaxanghomnay') fresh = await scrapers.scrapeGiaxanghomnay();
      else if (source === 'saigonpetro') fresh = await scrapers.scrapeSaigonPetro();
      else if (source === 'comeco') fresh = await scrapers.scrapeComeco();
      else if (source === 'petrotimes') fresh = await scrapers.scrapePetrotimes();
      else if (source === 'webgia') fresh = await scrapers.scrapeWebGia();

      if (fresh) {
        await updateFuelPrices(kv, source, fresh);
        data = fresh;
        stats = await getCacheStats(kv, source);
      }
    } catch (e) {
      console.error(`[OnDemand] Lỗi scrape ${source}:`, e.message);
      const ageMs = stats.scrapedAt ? Date.now() - new Date(stats.scrapedAt).getTime() : Number.POSITIVE_INFINITY;
      if (ageMs > (6 * 60 * 60 * 1000)) {
        c.header('Cache-Control', 'no-store');
        return c.json({ success: false, status: 'stale_unavailable', message: { vi: 'Lỗi đồng bộ dữ liệu', en: 'Sync failed' } }, 503);
      }
    }
  }

  if (!data || !data.prices || data.prices.length === 0) {
    c.header('Cache-Control', 'no-store');
    return c.json({
      success: false,
      status: 'unavailable',
      message: {
        vi: `Nguồn dữ liệu "${SOURCES[source]?.label || source}" hiện chưa sẵn sàng hoặc không có dữ liệu.`,
        en: `Data source "${SOURCES[source]?.label || source}" is currently unavailable or has no data.`
      }
    }, 503);
  }
  return c.json(await buildResponse(kv, source, data, stats, c));
});

// [GET] /api/provinces
app.get('/api/provinces', (c) => {
  const region = c.req.query('region');
  const filtered = region ? PROVINCES.filter((p) => p.region === region) : PROVINCES;
  setCacheHeaders(c, 86400);
  return c.json({
    success: true, status: 'ok',
    meta: {
      total: filtered.length,
      region1Count: PROVINCES.filter((p) => p.region === '1').length,
      region2Count: PROVINCES.filter((p) => p.region === '2').length,
      filterApplied: region ? `region=${region}` : null,
    },
    data: filtered,
  });
});

// [GET] /api/sources
app.get('/api/sources', async (c) => {
  const kv = c.env.FUEL_CACHE;
  setCacheHeaders(c, 3600);

  const sourceList = await Promise.all(Object.entries(SOURCES).map(async ([id, meta]) => {
    const stats = await getCacheStats(kv, id);
    return {
      id, label: meta.label, url: meta.url,
      populated: stats.hit, scrapedAt: stats.scrapedAt || null,
      ttlRemainingSeconds: stats.ttlRemaining || null, isStale: stats.isStale || false,
    };
  }));

  return c.json({
    success: true, status: 'ok',
    meta: { total: sourceList.length, populated: sourceList.filter((s) => s.populated).length },
    data: sourceList,
  });
});

// ── [API] Lịch sử Giá Xăng Dầu ────────────────────────────────────────────────
// [GET] /api/history (hoặc /api/history/:fuel_name)
app.get('/api/history/:fuel_name?', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.json({ success: false, error: 'Database is not configured for this instance.' }, 501);
  }

  const fuelName = c.req.param('fuel_name') || '';
  const limit = parseInt(c.req.query('limit')) || 500;

  try {
    const { getFuelPriceHistory } = await import('./db/repository.js');
    const history = await getFuelPriceHistory(db, fuelName, limit);
    return c.json({ success: true, fuel_name: fuelName || 'all', limit, data: history });
  } catch (error) {
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

app.get('/api/clear-cache', async (c) => {
  const kv = c.env.FUEL_CACHE;
  const cleared = [];

  // Clear national caches
  for (const src of Object.keys(SOURCES)) {
    await deleteFuelPrices(kv, src);
    cleared.push(`fuel:${src}`);
  }

  // Clear province caches
  try {
    if (kv && typeof kv.list === 'function') {
      const list = await kv.list({ prefix: 'province:' });
      if (list && list.keys) {
        for (const key of list.keys) {
          await kv.delete(key.name);
          cleared.push(key.name);
        }
      }
    }
  } catch (err) {
    console.error('[Cache] Lỗi xóa cache tỉnh:', err.message);
  }

  const storageInfo = {
    cacheType: kv && kv.constructor.name === 'MemoryKV' ? 'Local File (cache.json)' : 'Cloudflare KV Namespace (FUEL_CACHE)',
    dbType: c.env.DB ? (c.env.DB.constructor.name === 'Database' ? 'Local File (backend/data/history.db)' : 'Cloudflare D1 Database (vietfuel-history)') : 'Not Configured'
  };

  return c.json({
    success: true,
    message: {
      vi: 'Đã xóa toàn bộ cache thành công!',
      en: 'All cache cleared successfully!'
    },
    storage: storageInfo,
    clearedCount: cleared.length,
    clearedKeys: cleared
  });
});


app.notFound((c) => c.json({ success: false, message: 'Endpoint không tồn tại' }, 404));
app.onError((err, c) => c.json({ success: false, message: 'Lỗi máy chủ nội bộ' }, 500));

export { app };

export default {
  fetch: app.fetch,

  async scheduled(event, env, ctx) {
    const kv = env.FUEL_CACHE;
    const db = env.DB;
    ctx.waitUntil((async () => {
      let insertFuelPricesHistory = null;
      if (db) {
        try {
          const repo = await import('./db/repository.js');
          insertFuelPricesHistory = repo.insertFuelPricesHistory;
        } catch (e) { }
      }

      try {
        console.log('[Cron] Khởi chạy tác vụ thu thập giá xăng quốc gia...');

        // Scrape Petrolimex trước tiên, sau đó clone sang 3 mirror
        let petrolimexResult = null;
        try {
          petrolimexResult = await scrapers.scrapePetrolimex();
          await updateFuelPrices(kv, 'petrolimex', petrolimexResult);
          if (insertFuelPricesHistory) await insertFuelPricesHistory(db, 'petrolimex', petrolimexResult);
          console.log('[Cron] Đã cập nhật petrolimex');

          // Clone sang 3 mirror Petrolimex
          const mirrors = ['kv2_petrolimex', 'saigon_petrolimex', 'vungtau_petrolimex'];
          const mirrorData = { ...petrolimexResult, scrapedAt: new Date().toISOString() };
          for (const mirrorKey of mirrors) {
            await updateFuelPrices(kv, mirrorKey, { ...mirrorData, source: SOURCES[mirrorKey]?.label || mirrorKey });
            console.log(`[Cron] Đã cập nhật mirror ${mirrorKey}`);
          }
        } catch (e) {
          console.error('[Cron] Lỗi petrolimex:', e.message);
        }

        for (const sourceId of Object.keys(SOURCES)) {
          // Bỏ qua Petrolimex gốc và 3 mirror (đã xử lý ở trên)
          if (['petrolimex', 'kv2_petrolimex', 'saigon_petrolimex', 'vungtau_petrolimex', 'webgia'].includes(sourceId)) continue;

          let scrapeFn;
          if (sourceId === 'pvoil') scrapeFn = scrapers.scrapePVOil;
          else if (sourceId === 'mipec') scrapeFn = scrapers.scrapeMipec;
          else if (sourceId === 'giaxanghomnay') scrapeFn = scrapers.scrapeGiaxanghomnay;
          else if (sourceId === 'saigonpetro') scrapeFn = scrapers.scrapeSaigonPetro;
          else if (sourceId === 'comeco') scrapeFn = scrapers.scrapeComeco;
          else if (sourceId === 'petrotimes') scrapeFn = scrapers.scrapePetrotimes;
          else continue;

          try {
            const result = await scrapeFn();
            await updateFuelPrices(kv, sourceId, result);
            if (insertFuelPricesHistory) await insertFuelPricesHistory(db, sourceId, result);
            console.log(`[Cron] Đã cập nhật ${sourceId}`);
          } catch (e) {
            console.error(`[Cron] Lỗi ${sourceId}:`, e.message);
          }
        }
      } catch (e) {
        console.error('[Cron] Lỗi toàn cục:', e.message);
      }
    })());
  }
};
