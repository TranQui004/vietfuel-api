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
 * [CONFIGURATION] - Cấu hình hệ thống VietFuelAPI
 * Load biến môi trường và cung cấp thông số chạy chung.
 * ========================================================================== */

const path = require('path');

/**
 * Object lưu trữ toàn bộ cấu hình hệ thống.
 * @type {Object}
 */
module.exports = {
  // Cấu hình máy chủ
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Cấu hình Cache
  cache: {
    ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES, 10) || 60,
    filePath: path.join(__dirname, '../../cache.json'),
  },

  // Cấu hình Tác vụ định kỳ (Cron)
  cron: {
    // Lưu ý: Lịch trình thực tế sử dụng cơ chế "Adaptive Cron" 3 chế độ
    // được định nghĩa trực tiếp trong backend/workers/jobs.js dựa theo Nghị định 80/2023.
    // Biến CRON_SCHEDULE dưới đây chỉ dùng cho các logic fallback nếu có.
    schedule: process.env.CRON_SCHEDULE || '0 * * * *',
  },

  // Cấu hình Crawler - Chứa thông tin 11 nguồn dữ liệu
  scraper: {
    timeout: 60000,
    // 8 Nguồn chính
    petrolimexUrl: process.env.PETROLIMEX_URL || 'https://www.petrolimex.com.vn/index.html',
    pvoilUrl: process.env.PVOIL_URL || 'https://www.pvoil.com.vn/tin-gia-xang-dau',
    mipecUrl: process.env.MIPEC_URL || 'https://www.mipec.com.vn/pages/gia-xang-dau-ban-le',
    saigonpetroUrl: process.env.SAIGONPETRO_URL || 'https://saigonpetro.com.vn',
    comecoUrl: process.env.COMECO_URL || 'https://comeco.vn',
    petrotimesUrl: process.env.PETROTIMES_URL || 'https://petrotimes.vn/gia-xang-dau',
    webgiaUrl: process.env.WEBGIA_URL || 'https://webgia.com/gia-xang-dau/petrolimex/',
    giaxanghomnayUrl: process.env.GXHN_URL || 'https://giaxanghomnay.com',
    
    // 3 Nguồn Mirror (Petrolimex phân vùng)
    kv2PetrolimexUrl: process.env.KV2_PETROLIMEX_URL || 'https://kv2.petrolimex.com.vn',
    saigonPetrolimexUrl: process.env.SAIGON_PETROLIMEX_URL || 'https://saigon.petrolimex.com.vn',
    vungtauPetrolimexUrl: process.env.VUNGTAU_PETROLIMEX_URL || 'https://vungtau.petrolimex.com.vn',
  },
};


