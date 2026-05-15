/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 *
 * Licensed under the MIT License.
 * See LICENSE file for details.
 */
'use strict';

/* ==========================================================================
 * [FUEL HELPERS] - Hàm Tiện Ích & Hằng Số cho Xử Lý Dữ Liệu Xăng Dầu
 * Tách ra từ routes/fuel.js để tái sử dụng và dễ bảo trì.
 * ========================================================================== */

import { getFuelPrices, getCacheStats } from '../cache.js';

/* ==========================================================================
 * [CONSTANTS]
 * ========================================================================== */

const DISCLAIMER = {
  vi: 'Dữ liệu được thu thập tự động từ trang web công khai và chỉ mang tính tham khảo. API này hoạt động hoàn toàn độc lập, không đại diện cho bất kỳ doanh nghiệp hay cơ quan nhà nước nào.',
  en: 'Data is automatically collected from public websites for reference purposes only. This API operates independently and does not represent any company or government agency.',
};

const SOURCES = {
  petrolimex:         { label: 'Petrolimex',           url: 'https://www.petrolimex.com.vn' },
  kv2_petrolimex:     { label: 'Petrolimex KV2',       url: 'https://kv2.petrolimex.com.vn' },
  saigon_petrolimex:  { label: 'Petrolimex SAI GON',   url: 'https://saigon.petrolimex.com.vn' },
  vungtau_petrolimex: { label: 'Petrolimex VUNG TAU',  url: 'https://vungtau.petrolimex.com.vn' },
  pvoil:              { label: 'PVOil',                 url: 'https://www.pvoil.com.vn' },
  mipec:              { label: 'Mipec',                 url: 'https://www.mipec.com.vn/pages/gia-xang-dau-ban-le' },
  comeco:             { label: 'COMECO',                url: 'https://comeco.vn' },
  saigonpetro:        { label: 'Saigon Petro',          url: 'https://saigonpetro.com.vn/ban-le-xang-dau' },
  petrotimes:         { label: 'Petro Times',           url: 'https://petrotimesgroup.com' },
  webgia:             { label: 'WebGia (Mirror)',        url: 'https://webgia.com/gia-xang-dau/petrolimex/' },
  giaxanghomnay:      { label: 'GiaXangHomNay',         url: 'https://giaxanghomnay.com' },
};

// Thứ tự hiển thị chuẩn cho các loại nhiên liệu
const FUEL_ORDER = [
  'xăng ron 95-v', 'xăng ron 95-iii', 'xăng e10 ron 95-iii',
  'xăng e5 ron 92-ii', 'do 0,001s-v', 'do 0,05s-ii', 'dầu hỏa 2-k',
];

/* ==========================================================================
 * [HELPERS] - Hàm Tiện Ích
 * ========================================================================== */

/**
 * Gán thông số HTTP Cache Control cho chuỗi phản hồi (Response Headers) bằng Hono Context.
 *
 * @param {import('hono').Context} c
 * @param {number} [ttlSeconds=3600]
 */
function setCacheHeaders(c, ttlSeconds = 3600) {
  c.header('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=60`);
  c.header('Vary', 'Accept-Encoding');
}

/**
 * Sắp xếp thứ tự các loại nhiên liệu theo mức phổ biến chuẩn thị trường.
 *
 * @param {Object[]} prices - Mảng dữ liệu nhiên liệu chưa sắp xếp.
 * @returns {Object[]}
 */
function sortPrices(prices) {
  return [...prices].sort((a, b) => {
    const ia = FUEL_ORDER.indexOf(a.name?.toLowerCase());
    const ib = FUEL_ORDER.indexOf(b.name?.toLowerCase());
    if (ia === -1 && ib === -1) return a.name?.localeCompare(b.name, 'vi') ?? 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Chuẩn hoá định dạng ngày giá xăng về ISO YYYY-MM-DD.
 * Trả về null nếu ngày không hợp lệ hoặc quá cũ/tương lai.
 *
 * @param {string} raw
 * @returns {string|null}
 */
function normalizePriceDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;

  let iso = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    iso = v;
  } else {
    const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  if (!iso) return null;

  const ts = Date.parse(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(ts)) return null;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const ageDays = Math.floor((now - ts) / dayMs);
  if (ageDays < 0 || ageDays > 14) return null;

  return iso;
}

/**
 * Lấy ngày giá tham chiếu từ nguồn uy tín nhất đang có trong cache.
 *
 * @param {Object} kv
 * @returns {Promise<string|null>}
 */
async function getReferencePriceDate(kv) {
  const preferred = ['petrolimex', 'kv2_petrolimex', 'saigon_petrolimex', 'vungtau_petrolimex', 'giaxanghomnay', 'webgia'];
  for (const key of preferred) {
    const data = await getFuelPrices(kv, key);
    const normalized = normalizePriceDate(data?.priceDate);
    if (normalized) return normalized;
  }
  return null;
}

/**
 * Làm phong phú Metadata bằng cách format ngày và chèn thêm thông tin bổ sung.
 *
 * @param {Object} data
 * @param {Object} [extra={}]
 * @returns {Object}
 */
function enrichMeta(data, extra = {}) {
  const priceDate = normalizePriceDate(data.priceDate);
  let priceDateDisplay = null;
  if (priceDate) {
    const [y, m, d] = priceDate.split('-');
    priceDateDisplay = d && m && y ? `${d}/${m}/${y}` : priceDate;
  }
  return {
    scrapedAt: data.scrapedAt,
    priceDate,
    priceDateDisplay,
    ...extra,
  };
}

/**
 * Chuẩn hoá tên nhiên liệu để so sánh và nhóm đồng nhất.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name = '') {
  let n = name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (n.includes('sinh học') || n.includes('không chì')) {
    n = n.replace('sinh học ', '').replace('không chì ', '');
  }
  n = n.replace(' mức 2', '-ii').replace(' mức 3', '-iii').replace(' mức 5', '-v');
  if (n.includes('điêzen') || n.includes('diezel') || n.includes('dầu do')) {
    n = n.replace(/dầu điêzen|điêzen|diezel|dầu do/g, 'do');
  }
  n = n.replace(/0\.05/g, '0,05').replace(/0\.001/g, '0,001');
  return n.replace(/\s+-/g, '-').trim();
}

/* ==========================================================================
 * [RESPONSE BUILDERS]
 * ========================================================================== */

/**
 * Xử lý khi Service vừa được khởi động lại và chưa cào xong dữ liệu.
 *
 * @param {import('hono').Context} c
 */
function notReady(c) {
  c.header('Cache-Control', 'no-store');
  return c.json({
    success: false, status: 'unavailable',
    message: {
      vi: 'Dữ liệu chưa sẵn sàng. Hệ thống đang thực hiện lần cập nhật đầu tiên, vui lòng thử lại sau 1–2 phút.',
      en: 'Data not yet available. The system is performing its first update. Please try again in 1–2 minutes.',
    },
  }, 503);
}

/**
 * Cấu trúc đóng gói JSON thành công khi trả dữ liệu về.
 *
 * @param {Object} kv
 * @param {string} source
 * @param {Object} data
 * @param {Object} stats
 * @param {import('hono').Context} c
 * @returns {Promise<Object>}
 */
async function buildResponse(kv, source, data, stats, c) {
  const sorted = sortPrices(data.prices);
  const ttl = stats.ttlRemaining || 3600;
  setCacheHeaders(c, Math.min(ttl, 3600));

  const sourceDate = normalizePriceDate(data.priceDate);
  const referenceDate = await getReferencePriceDate(kv);
  const shouldFallbackToReference = !sourceDate && ['mipec', 'pvoil'].includes(source);
  const effectiveDate = shouldFallbackToReference ? referenceDate : sourceDate;

  let priceDateSource = data.priceDateSource || null;
  if (!priceDateSource && sourceDate) priceDateSource = 'source';
  if (!priceDateSource && shouldFallbackToReference && referenceDate) {
    priceDateSource = 'petrolimex-reference-fallback';
  }

  return {
    success: true,
    status: 'ok',
    disclaimer: DISCLAIMER,
    meta: {
      source: SOURCES[source]?.label || source,
      sourceUrl: SOURCES[source]?.url || null,
      ...enrichMeta({ ...data, priceDate: effectiveDate }),
      priceDateSource,
      priceAnnouncedAt: data.priceAnnouncedAt || null,
      blockedByProtection: Boolean(data.blockedByProtection),
      cacheHit: stats.hit,
      cacheTtlRemainingSeconds: stats.ttlRemaining,
      isStale: stats.isStale || false,
      totalItems: sorted.length,
    },
    data: sorted,
  };
}

/**
 * Tổng hợp dữ liệu từ tất cả nguồn vào một danh sách nhóm theo sản phẩm.
 *
 * @param {Object} kv
 * @returns {Promise<Object|null>}
 */
async function buildDefaultPrices(kv) {
  const ALL_KEYS = Object.keys(SOURCES);
  const fuelMap = new Map();
  const dataSourcesList = [];

  let primaryKey = null;
  let priceDate = null;
  let scrapedAt = null;

  for (const key of ALL_KEYS) {
    const d = await getFuelPrices(kv, key);
    if (!d || !d.prices || d.prices.length === 0) continue;

    dataSourcesList.push(key);

    if (!primaryKey && ['petrolimex', 'comeco', 'saigonpetro', 'giaxanghomnay'].includes(key)) {
      primaryKey = key;
      scrapedAt = d.scrapedAt;
    }
    if (!priceDate && d.priceDate) {
      priceDate = normalizePriceDate(d.priceDate);
    }

    for (const item of d.prices) {
      const normName = normalizeName(item.name);
      if (!fuelMap.has(normName)) {
        fuelMap.set(normName, {
          name: item.name,
          unit: item.unit || 'VND/lít',
          sources: [],
        });
      }
      fuelMap.get(normName).sources.push({
        source: key,
        region1: item.region1 ?? null,
        region2: item.region2 ?? null,
        price: item.price ?? null,
      });
    }
  }

  if (fuelMap.size === 0) return null;

  const mergedPrices = Array.from(fuelMap.values());
  const sortedPrices = sortPrices(mergedPrices);

  const primaryStats = await getCacheStats(kv, primaryKey || dataSourcesList[0]);
  const ttlRemaining = primaryStats.ttlRemaining || 3600;

  return {
    prices: sortedPrices,
    primarySourceKey: primaryKey || dataSourcesList[0],
    dataSources: dataSourcesList,
    priceDate,
    scrapedAt: scrapedAt || new Date().toISOString(),
    cacheHit: primaryStats.hit,
    ttlRemaining,
    isStale: primaryStats.isStale || false,
  };
}

export { 
  DISCLAIMER,
  SOURCES,
  FUEL_ORDER,
  setCacheHeaders,
  sortPrices,
  normalizePriceDate,
  getReferencePriceDate,
  enrichMeta,
  normalizeName,
  notReady,
  buildResponse,
  buildDefaultPrices,
 };

