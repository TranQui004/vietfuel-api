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
 * [LOGGER UTILITY] - Hệ thống ghi log (Winston)
 * Cấu hình ghi log ra console và file với các mức phân quyền.
 * ========================================================================== */

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

/**
 * Định dạng cơ bản cho các bản ghi log.
 */
const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const EventEmitter = require('events');
const { Writable } = require('stream');

class LogEmitter extends EventEmitter {}
const logStream = new LogEmitter();

// Custom stream chuẩn của Node.js cho Winston
const wsWritable = new Writable({
  write(chunk, encoding, callback) {
    logStream.emit('log', chunk.toString());
    callback();
  }
});

// Custom transport cho WebSocket
const wsTransport = new transports.Stream({
  stream: wsWritable
});

/**
 * Đối tượng Winston Logger được cấu hình sẵn.
 * Sử dụng: logger.info(), logger.error(), logger.warn()...
 * @type {import('winston').Logger}
 */
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // 1. Log ra Console trực tiếp
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    // 2. Log ra websocket (frontend terminal)
    wsTransport,
    // 3. Log lỗi (Error) vào file error.log
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // Giới hạn 5MB/file
      maxFiles: 3,
    }),
    // 4. Log tổng hợp vào file combined.log
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // Giới hạn 10MB/file
      maxFiles: 5,
    }),
  ],
  // 5. Bắt các Uncaught Exceptions
  exceptionHandlers: [new transports.File({ filename: 'logs/exceptions.log' })],
});

logger.logStream = logStream; // Export để dùng bên ngoài
module.exports = logger;

