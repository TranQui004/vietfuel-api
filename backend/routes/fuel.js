/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 * All rights reserved.
 * 
 * This source code is the intellectual property of TranQui.
 * Community contributions and pull requests are highly welcomed!
 */
'use strict';

/* ==========================================================================
 * [ROUTES] - API Xăng Dầu (VietFuelAPI)
 * Định nghĩa và xử lý phân luồng các đầu mối API công khai.
 * ========================================================================== */

const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  getFuelPrices, getCacheStats,
  getProvincePrice, updateProvincePrice, getProvinceCacheStats, updateFuelPrices,
} = require('../services/cache');
const { scrapeProvincePrice, scrapePVOil } = require('../services/scraper');
const {
  DISCLAIMER, SOURCES,
  setCacheHeaders, sortPrices,
  normalizePriceDate, enrichMeta,
  notReady, buildResponse, buildDefaultPrices,
} = require('../utils/fuel-helpers');

const PROVINCES = require('../data/provinces.json');

const router = express.Router();

/* ==========================================================================
 * [RATE LIMITING] - Bảo vệ máy chủ khỏi Spam/DDoS
 * ========================================================================== */

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'rate_limited',
    message: {
      vi: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
      en: 'Too many requests. Please try again after 1 minute.',
    },
  },
});

const provinceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'rate_limited',
    message: {
      vi: 'Quá nhiều yêu cầu tra cứu tỉnh thành. Vui lòng thử lại sau 1 phút.',
      en: 'Too many province requests. Please try again after 1 minute.',
    },
  },
});

router.use(generalLimiter);

/* ==========================================================================
 * [ĐẦU MỐI API] TỔNG HỢP TẤT CẢ NGUỒN
 * ========================================================================== */

/**
 * [GET] /api/fuel-prices
 * Gộp toàn bộ dữ liệu từ tất cả nguồn thành 1 JSON nhóm theo sản phẩm.
 */
router.get('/fuel-prices', (req, res) => {
  const defaultData = buildDefaultPrices();
  if (!defaultData) return notReady(res);

  const { prices, primarySourceKey, dataSources,
    priceDate, scrapedAt, cacheHit, ttlRemaining } = defaultData;

  const primarySource = SOURCES[primarySourceKey]?.label || primarySourceKey;
  const primarySourceUrl = SOURCES[primarySourceKey]?.url || null;

  let priceDateDisplay = null;
  const normalizedPriceDate = normalizePriceDate(priceDate);
  if (normalizedPriceDate) {
    const [y, m, d] = normalizedPriceDate.split('-');
    priceDateDisplay = d && m && y ? `${d}/${m}/${y}` : priceDate;
  }

  setCacheHeaders(res, Math.min(ttlRemaining, 3600));
  return res.json({
    success: true,
    status: 'ok',
    disclaimer: DISCLAIMER,
    meta: {
      primarySourceId: primarySourceKey,
      primarySource,
      primarySourceUrl,
      dataSources,
      sourceCount: dataSources.length,
      scrapedAt,
      priceDate: normalizedPriceDate,
      priceDateDisplay,
      cacheHit,
      cacheTtlRemainingSeconds: ttlRemaining,
      totalItems: prices.length,
    },
    data: prices,
  });
});

/* ==========================================================================
 * [ĐẦU MỐI API] TRA CỨU THEO TỈNH THÀNH
 * ========================================================================== */

/**
 * [GET] /api/fuel-prices/province/:slug
 * Cào on-demand cho 1 tỉnh cụ thể.
 */
router.get('/fuel-prices/province/:slug', provinceLimiter, async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  const province = PROVINCES.find((p) => p.slug === slug);

  if (!province) {
    res.set('Cache-Control', 'no-store');
    return res.status(404).json({
      success: false, status: 'not_found',
      message: {
        vi: `Không tìm thấy tỉnh "${slug}". Xem danh sách đầy đủ tại /api/provinces.`,
        en: `Province "${slug}" not found. See full list at /api/provinces.`,
      },
    });
  }

  const cached = getProvincePrice(slug);
  const stats = getProvinceCacheStats(slug);

  if (cached) {
    const sorted = sortPrices(cached.prices);
    const ttl = stats.ttlRemaining || 3600;
    setCacheHeaders(res, ttl);
    return res.json({
      success: true, status: 'ok',
      disclaimer: DISCLAIMER,
      meta: {
        province: province.name, slug, region: province.region,
        source: 'GiaXangHomNay', sourceUrl: `https://giaxanghomnay.com/tinh-tp/${slug}`,
        ...enrichMeta(cached),
        cacheHit: true, cacheTtlRemainingSeconds: ttl, totalItems: sorted.length,
      },
      data: sorted,
    });
  }

  // [CACHE] Cache miss, thực hiện cào on-demand.
  try {
    res.set('Cache-Control', 'no-store');
    const data = await scrapeProvincePrice(slug);
    updateProvincePrice(slug, data);
    const sorted = sortPrices(data.prices);
    return res.json({
      success: true, status: 'ok',
      disclaimer: DISCLAIMER,
      meta: {
        province: data.provinceName || province.name, slug,
        region: data.region || province.region,
        source: 'GiaXangHomNay', sourceUrl: `https://giaxanghomnay.com/tinh-tp/${slug}`,
        ...enrichMeta(data),
        cacheHit: false, cacheTtlRemainingSeconds: 3600, totalItems: sorted.length,
      },
      data: sorted,
    });
  } catch {
    return res.status(502).json({
      success: false, status: 'scrape_error',
      message: {
        vi: `Không thể lấy dữ liệu cho "${province.name}". Vui lòng thử lại sau.`,
        en: `Failed to fetch data for "${province.name}". Please try again later.`,
      },
    });
  }
});

/* ==========================================================================
 * [ĐẦU MỐI API] DỮ LIỆU TỪ 1 NGUỒN CỤ THỂ
 * ========================================================================== */

/**
 * [GET] /api/fuel-prices/:source
 * Trả dữ liệu duy nhất từ 1 nguồn được chỉ định.
 */
router.get('/fuel-prices/:source', async (req, res) => {
  const source = req.params.source.toLowerCase();
  if (!SOURCES[source]) {
    res.set('Cache-Control', 'no-store');
    return res.status(400).json({
      success: false, status: 'invalid_source',
      message: {
        vi: `Nguồn không hợp lệ. Các nguồn hỗ trợ: ${Object.keys(SOURCES).join(', ')}.`,
        en: `Invalid source. Supported: ${Object.keys(SOURCES).join(', ')}.`,
      },
      availableSources: Object.entries(SOURCES).map(([k, v]) => ({ id: k, label: v.label, url: v.url })),
    });
  }

  let data = getFuelPrices(source);
  let stats = getCacheStats(source);

  // [PVOIL] Nguồn này hay đổi cấu trúc và dễ giữ cache cũ khi scraper lỗi,
  // nên ưu tiên làm mới ngay tại thời điểm request nếu cache stale hoặc rỗng.
  if (source === 'pvoil' && (!data || stats.isStale)) {
    try {
      const fresh = await scrapePVOil();
      updateFuelPrices('pvoil', fresh);
      data = fresh;
      stats = getCacheStats('pvoil');
    } catch {
      // [PVOIL] Nếu chỉ còn cache stale thì chỉ cho phép tối đa 6 giờ,
      // tránh trả dữ liệu quá cũ gây sai lệch đầu ra cho người dùng.
      const ageMs = stats.scrapedAt ? Date.now() - new Date(stats.scrapedAt).getTime() : Number.POSITIVE_INFINITY;
      const staleTooLong = ageMs > (6 * 60 * 60 * 1000);
      if (staleTooLong) {
        res.set('Cache-Control', 'no-store');
        return res.status(503).json({
          success: false,
          status: 'pvoil_stale_unavailable',
          message: {
            vi: 'Nguồn PVOIL đang lỗi đồng bộ và cache đã quá cũ. Vui lòng thử lại sau.',
            en: 'PVOIL source sync failed and cached data is too old. Please try again later.',
          },
        });
      }
    }
  }

  if (!data) return notReady(res);
  return res.json(buildResponse(source, data, stats, res));
});

/* ==========================================================================
 * [ĐẦU MỐI API] DANH SÁCH 63 TỈNH THÀNH
 * ========================================================================== */

/**
 * [GET] /api/provinces
 * Danh sách tĩnh tên tỉnh thành và vùng áp dụng giá.
 */
router.get('/provinces', (req, res) => {
  const region = req.query.region;
  const filtered = region ? PROVINCES.filter((p) => p.region === region) : PROVINCES;
  setCacheHeaders(res, 86400);
  return res.json({
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

/* ==========================================================================
 * [ĐẦU MỐI API] DANH SÁCH NGUỒN DỮ LIỆU
 * ========================================================================== */

/**
 * [GET] /api/sources
 * Trả về danh sách tất cả nguồn dữ liệu đang được hệ thống thu thập,
 * kèm trạng thái cache hiện tại của từng nguồn.
 * Endpoint này giúp nhà phát triển đối chiếu và kiểm tra tính minh bạch.
 */
router.get('/sources', (req, res) => {
  setCacheHeaders(res, 3600);

  const sourceList = Object.entries(SOURCES).map(([id, meta]) => {
    const stats = getCacheStats(id);
    return {
      id,
      label: meta.label,
      url: meta.url,
      populated: stats.hit,
      scrapedAt: stats.scrapedAt || null,
      ttlRemainingSeconds: stats.ttlRemaining || null,
      isStale: stats.isStale || false,
    };
  });

  return res.json({
    success: true,
    status: 'ok',
    meta: {
      total: sourceList.length,
      populated: sourceList.filter((s) => s.populated).length,
    },
    data: sourceList,
  });
});



/**
 * [GET] /api/health
 * Ping máy chủ, kiểm tra mọi nguồn cache đã sẵn sàng chưa.
 */
router.get('/health', (req, res) => {
  const sourceStats = {};
  let allHealthy = true;
  Object.keys(SOURCES).forEach((src) => {
    const s = getCacheStats(src);
    sourceStats[src] = {
      label: SOURCES[src].label,
      populated: s.hit,
      scrapedAt: s.scrapedAt,
      ttlRemainingSeconds: s.ttlRemaining,
    };
    if (!s.hit) allHealthy = false;
  });
  const status = allHealthy ? 'healthy' : 'degraded';
  res.set('Cache-Control', 'no-store');
  return res.status(200).json({
    success: true, status,
    sources: sourceStats,
    endpoints: {
      nationalSources: Object.keys(SOURCES),
      provinceCount: PROVINCES.length,
      apiVersion: '2.0',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
module.exports.PROVINCES = PROVINCES;
module.exports.SOURCES = SOURCES;

