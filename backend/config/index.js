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
    schedule: process.env.CRON_SCHEDULE || '0 * * * *', // Mặc định: Mỗi 1 giờ
  },

  // Cấu hình Crawler
  scraper: {
    petrolimexUrl: process.env.PETROLIMEX_URL || 'https://www.petrolimex.com.vn/index.html',
    pvoilUrl: process.env.PVOIL_URL || 'https://www.pvoil.com.vn/tin-gia-xang-dau',
    mipecUrl: process.env.MIPEC_URL || 'https://www.mipec.com.vn/pages/gia-xang-dau-ban-le',
    webgiaUrl: process.env.WEBGIA_URL || 'https://webgia.com/gia-xang-dau/petrolimex/',
    giaxanghomnayUrl: process.env.GXHN_URL || 'https://giaxanghomnay.com',
    timeout: 60000,
  },
};


