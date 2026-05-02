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
 * [WEBSOCKET SERVER] - Phát sóng Logs Server-side tới Client /live
 * Tách từ index.js để giữ entry-point gọn gàng.
 * ========================================================================== */

const { WebSocketServer } = require('ws');

/**
 * Khởi tạo WebSocket Server đính kèm với HTTP server.
 * Phát sóng log từ winston tới toàn bộ client đang kết nối.
 *
 * @param {import('http').Server} httpServer - HTTP server Express đang listen.
 * @param {import('winston').Logger} logger - Logger đã cấu hình.
 */
function initWebSocketServer(httpServer, logger) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/logs' });

  // Phát sóng log tới toàn bộ client đang mở
  if (logger.logStream) {
    logger.logStream.on('log', (msg) => {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(msg);
        }
      });
    });
  }

  wss.on('connection', (ws) => {
    ws.send('[SYSTEM] Đã kết nối Terminal Server (VietFuelAPI)\n');
  });

  logger.info('[WebSocket] Server khởi động tại /ws/logs');
  return wss;
}

module.exports = { initWebSocketServer };

