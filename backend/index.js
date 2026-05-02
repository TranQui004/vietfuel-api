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
 * [ĐIỂM VÀO ỨNG DỤNG] Khởi động VietFuelAPI.
 * Xử lý: cấu hình Express, middleware, đăng ký route và lắng nghe cổng.
 * ========================================================================== */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const { initWebSocketServer } = require('./utils/websocket');
const { startJobs } = require('./workers/jobs');
const fuelRoutes = require('./routes/fuel');

/* ==========================================================================
 * [CẤU HÌNH EXPRESS] Khởi tạo ứng dụng và middleware.
 * ========================================================================== */

const app = express();

app.use(cors());
app.use(express.json());

// Nén Gzip/Brotli giúp giảm ~70% dung lượng response
app.use(compression());

// Tự động chặn XSS, Clickjacking, MIME type sniffing...
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src':  ["'self'", "'unsafe-inline'"],
      'style-src':   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src':    ["'self'", 'https://fonts.gstatic.com'],
      'img-src':     ["'self'", 'data:'],
    },
  },
}));

// Ẩn thông tin framework
app.disable('x-powered-by');

/* ==========================================================================
 * [ROUTE] Đăng ký API và giao diện.
 * ========================================================================== */

// API chính
app.use('/api', fuelRoutes);

// [VIEW ENGINE] Cấu hình EJS.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'views'));

// [TÀI NGUYÊN TĨNH] Phục vụ CSS, JS, hình ảnh.
app.use(express.static(path.join(__dirname, '..', 'frontend'), { index: false }));

// [TRANG GIAO DIỆN] Các route render EJS.
app.get('/',           (req, res) => res.render('index'));
app.get('/endpoints',  (req, res) => res.render('endpoints'));
app.get('/live',       (req, res) => res.render('live'));
app.get('/disclaimer', (req, res) => res.render('disclaimer'));
app.get('/privacy',    (req, res) => res.render('privacy'));
app.get('/terms',      (req, res) => res.render('terms'));

/* ==========================================================================
 * [XỬ LÝ LỖI] Bộ bắt lỗi toàn cục.
 * ========================================================================== */

// [404] API route không tồn tại.
app.use('/api', (_, res) => {
  res.status(404).json({
    success: false,
    status: 'not_found',
    message: { vi: 'Endpoint không tồn tại.', en: 'Endpoint not found.' },
  });
});

// [500] Middleware xử lý lỗi bất thường.
app.use((err, _, res, _next) => {
  logger.error(err);
  res.status(500).json({
    success: false,
    status: 'error',
    message: { vi: 'Đã xảy ra lỗi máy chủ.', en: 'Internal server error.' },
  });
});

/* ==========================================================================
 * [KHỞI ĐỘNG] Bật server và các dịch vụ nền.
 * ========================================================================== */

async function bootstrap() {
  logger.info('[Bootstrap] Khởi động VietFuelAPI...');

  // [JOBS] Khởi động tác vụ cào dữ liệu nền và cron.
  startJobs(config, logger);

  // [MÁY CHỦ] Dựng HTTP server và WebSocket.
  const server = app.listen(config.port, () => {
    logger.info(`[Bootstrap] Server đang chạy tại http://localhost:${config.port}`);
    logger.info(`[Bootstrap] API: http://localhost:${config.port}/api/fuel-prices`);
  });

  initWebSocketServer(server, logger);
}

bootstrap().catch((err) => {
  logger.error(`[Bootstrap] Lỗi nghiêm trọng: ${err.message}`);
  process.exit(1);
});


