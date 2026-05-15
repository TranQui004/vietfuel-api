import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { 
  getFuelPrices, getCacheStats, updateFuelPrices,
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
  
  return c.json({
    success: true, status,
    sources: sourceStats,
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
  const defaultData = await buildDefaultPrices(kv);
  if (!defaultData) return notReady(c);

  const { prices, primarySourceKey, dataSources,
    priceDate, scrapedAt, cacheHit, ttlRemaining } = defaultData;

  const primarySource = SOURCES[primarySourceKey]?.label || primarySourceKey;
  const primarySourceUrl = SOURCES[primarySourceKey]?.url || null;

  let priceDateDisplay = null;
  if (priceDate) {
    const [y, m, d] = priceDate.split('-');
    priceDateDisplay = d && m && y ? `${d}/${m}/${y}` : priceDate;
  }

  setCacheHeaders(c, Math.min(ttlRemaining, 3600));
  return c.json({
    success: true, status: 'ok', disclaimer: DISCLAIMER,
    meta: {
      primarySourceId: primarySourceKey, primarySource, primarySourceUrl,
      dataSources, sourceCount: dataSources.length,
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

  let data = await getFuelPrices(kv, source);
  let stats = await getCacheStats(kv, source);

  if (source === 'pvoil' && (!data || stats.isStale)) {
    try {
      const fresh = await scrapers.scrapePVOil();
      await updateFuelPrices(kv, 'pvoil', fresh);
      data = fresh;
      stats = await getCacheStats(kv, 'pvoil');
    } catch (e) {
      const ageMs = stats.scrapedAt ? Date.now() - new Date(stats.scrapedAt).getTime() : Number.POSITIVE_INFINITY;
      if (ageMs > (6 * 60 * 60 * 1000)) {
        c.header('Cache-Control', 'no-store');
        return c.json({ success: false, status: 'pvoil_stale_unavailable', message: { vi: 'Lỗi đồng bộ', en: 'Sync failed' } }, 503);
      }
    }
  }

  if (!data) return notReady(c);
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

app.notFound((c) => c.json({ success: false, message: 'Endpoint không tồn tại' }, 404));
app.onError((err, c) => c.json({ success: false, message: 'Lỗi máy chủ nội bộ' }, 500));

export default {
  fetch: app.fetch,

  async scheduled(event, env, ctx) {
    const kv = env.FUEL_CACHE;
    ctx.waitUntil((async () => {
      try {
        console.log('[Cron] Khởi chạy tác vụ thu thập giá xăng quốc gia...');
        for (const sourceId of Object.keys(SOURCES)) {
          // Bỏ qua WebGia mirror để tránh spam
          if (sourceId === 'webgia') continue; 
          
          let scrapeFn;
          if (sourceId === 'petrolimex') scrapeFn = scrapers.scrapePetrolimex;
          else if (sourceId === 'pvoil') scrapeFn = scrapers.scrapePVOil;
          else if (sourceId === 'mipec') scrapeFn = scrapers.scrapeMipec;
          else if (sourceId === 'giaxanghomnay') scrapeFn = scrapers.scrapeGiaxanghomnay;
          else if (sourceId === 'saigonpetro') scrapeFn = scrapers.scrapeSaigonPetro;
          else if (sourceId === 'comeco') scrapeFn = scrapers.scrapeComeco;
          else if (sourceId === 'petrotimes') scrapeFn = scrapers.scrapePetrotimes;
          else continue;

          try {
            const result = await scrapeFn();
            await updateFuelPrices(kv, sourceId, result);
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
