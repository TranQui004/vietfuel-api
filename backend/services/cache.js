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
 * [CACHE SYSTEM] - Quản lý lưu trữ In-memory & Fallback xuống ổ đĩa
 * Sử dụng node-cache để giảm tải server và tăng tốc API.
 * ========================================================================== */

const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const TTL_SECONDS = config.cache.ttlMinutes * 60;
const PROVINCE_TTL_SECONDS = 3600; // 1 giờ cho dữ liệu tỉnh thành
const CACHE_FILE = path.resolve(config.cache.filePath);

// Khởi tạo Cache chính cho 5 nguồn dữ liệu quốc gia (Không tự động xóa: stdTTL = 0)
const memCache = new NodeCache({ stdTTL: 0, checkperiod: 600, useClones: false });

// Cache độc lập phục vụ riêng cho tra cứu tỉnh thành (giảm tải memory)
const provinceCache = new NodeCache({ stdTTL: 0, checkperiod: 300, useClones: false });

/** Danh sách khóa (keys) hệ thống */
const KEYS = {
  petrolimex: 'fuel:petrolimex',
  kv2_petrolimex: 'fuel:kv2_petrolimex',
  saigon_petrolimex: 'fuel:saigon_petrolimex',
  vungtau_petrolimex: 'fuel:vungtau_petrolimex',
  pvoil: 'fuel:pvoil',
  mipec: 'fuel:mipec',
  webgia: 'fuel:webgia',
  giaxanghomnay: 'fuel:giaxanghomnay',
  saigonpetro: 'fuel:saigonpetro',
  comeco: 'fuel:comeco',
  petrotimes: 'fuel:petrotimes',
};

/**
 * Đọc dữ liệu từ file cache trên ổ cứng vào bộ nhớ RAM khi khởi động.
 * Giúp API có dữ liệu phản hồi ngay thay vì chờ Crawler chạy xong.
 */
function loadFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      Object.keys(KEYS).forEach((source) => {
        if (data?.[source]) {
          memCache.set(KEYS[source], data[source]);
          logger.info(`[Cache] Nạp ${source} từ disk: ${data[source].prices?.length} sản phẩm`);
        }
      });
    }
  } catch (err) {
    logger.warn(`[Cache] Không thể nạp cache từ disk: ${err.message}`);
  }
}

/**
 * Ghi toàn bộ dữ liệu từ bộ nhớ RAM xuống ổ đĩa (Snapshot).
 * Được gọi tự động mỗi khi có dữ liệu mới được cập nhật.
 */
function saveToDisk() {
  try {
    const snapshot = {};
    Object.keys(KEYS).forEach((source) => { 
      snapshot[source] = memCache.get(KEYS[source]) || null; 
    });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
    logger.debug('[Cache] Đã lưu cache xuống disk.');
  } catch (err) {
    logger.warn(`[Cache] Không thể lưu cache xuống disk: ${err.message}`);
  }
}

/* ==========================================================================
 * [QUỐC GIA] - QUẢN LÝ DỮ LIỆU CẤP QUỐC GIA (5 SOURCES)
 * ========================================================================== */

/**
 * Truy xuất giá xăng dầu của một nguồn cấp quốc gia.
 *
 * @param {string} source - Nguồn cần lấy (VD: 'petrolimex', 'pvoil').
 * @returns {Object|null} - Đối tượng chứa mảng giá xăng, ngày giờ,...
 */
function getFuelPrices(source) {
  return memCache.get(KEYS[source]) || null;
}

/**
 * Cập nhật giá xăng dầu vào Cache bộ nhớ, đồng thời kích hoạt lưu đĩa.
 *
 * @param {string} source - Nguồn cấp dữ liệu cào được.
 * @param {Object} data - Khối dữ liệu Scraper trả về.
 */
function updateFuelPrices(source, data) {
  memCache.set(KEYS[source], data);
  saveToDisk();
  logger.info(`[Cache] Cập nhật ${source}: ${data.prices.length} sản phẩm. TTL: ${config.cache.ttlMinutes} phút.`);
}

/**
 * Lấy trạng thái hoạt động Cache của một nguồn quốc gia nhất định.
 *
 * @param {string} source - Nguồn cấp.
 * @returns {Object} - Object chứa tình trạng (hit: boolean, scrapedAt, ttlRemaining, isStale).
 */
function getCacheStats(source) {
  const data = getFuelPrices(source);
  if (!data) return { hit: false, scrapedAt: null, ttlRemaining: null, isStale: false };
  
  const ageMs = Date.now() - new Date(data.scrapedAt).getTime();
  const ttlRemaining = Math.max(0, TTL_SECONDS - Math.round(ageMs / 1000));
  const isStale = ageMs > (TTL_SECONDS * 1000);

  return { hit: true, scrapedAt: data.scrapedAt, ttlRemaining, isStale };
}

/* ==========================================================================
 * [TỈNH THÀNH] - QUẢN LÝ DỮ LIỆU ON-DEMAND (63 TỈNH THÀNH)
 * ========================================================================== */

/**
 * Láy dữ liệu giá xăng dầu của một Tỉnh từ Cache tỉnh thành.
 *
 * @param {string} slug - Mã định danh tỉnh (VD: 'thanh-hoa').
 * @returns {Object|null} - Dữ liệu giá nhiên liệu.
 */
function getProvincePrice(slug) {
  return provinceCache.get(`province:${slug}`) || null;
}

/**
 * Lưu trữ dữ liệu tỉnh vào bộ đệm (Province Cache) để tránh Spam Website nguồn.
 *
 * @param {string} slug - Mã định danh tỉnh.
 * @param {Object} data - Chi tiết số liệu giá xăng dầu.
 */
function updateProvincePrice(slug, data) {
  provinceCache.set(`province:${slug}`, data);
  logger.info(`[Cache:Province] Cập nhật ${slug}: ${data.prices.length} sản phẩm.`);
}

/**
 * Lấy tình trạng Cache Tỉnh để xử lý gắn Header Cache-Control phù hợp.
 *
 * @param {string} slug - Mã tỉnh/thành phố.
 * @returns {Object} - Thông tin vòng đời (TTL) và độ trễ.
 */
function getProvinceCacheStats(slug) {
  const data = getProvincePrice(slug);
  if (!data) return { hit: false, scrapedAt: null, ttlRemaining: null, isStale: false };
  
  const ageMs = Date.now() - new Date(data.scrapedAt).getTime();
  const ttlRemaining = Math.max(0, PROVINCE_TTL_SECONDS - Math.round(ageMs / 1000));
  const isStale = ageMs > (PROVINCE_TTL_SECONDS * 1000);

  return { hit: true, scrapedAt: data.scrapedAt, ttlRemaining, isStale };
}

/* ==========================================================================
 * TIỆN ÍCH DỌN DẸP
 * ========================================================================== */

/**
 * Xóa sạch tệp sao lưu trên phân vùng ổ đĩa và RAM.
 * Dùng khi cần bắt buộc crawler đọc mới mọi dữ liệu (Force refresh).
 */
function clearDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      logger.info('[Cache] Đã xóa cache disk.');
    }
    memCache.flushAll();
    provinceCache.flushAll();
  } catch (err) {
    logger.warn(`[Cache] Lỗi khi xóa cache: ${err.message}`);
  }
}

// Khôi phục RAM Cache từ file trên Đĩa ngay khi boot Server.
loadFromDisk();

module.exports = { 
  getFuelPrices, 
  updateFuelPrices, 
  getCacheStats, 
  getProvincePrice, 
  updateProvincePrice, 
  getProvinceCacheStats, 
  clearDiskCache 
};

