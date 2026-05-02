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
 * [TEST] - Smoke Test GiaXangHomNay
 * Mục đích: Đảm bảo Scraper GiaXangHomNay hoạt động và trả tự động dữ liệu chuẩn.
 * ========================================================================== */

const assert = require('assert');
const { scrapeGiaxanghomnay } = require('../../services/scraper');

async function run() {
  const startedAt = Date.now();
  const result = await scrapeGiaxanghomnay();

  assert(result, 'Giaxanghomnay result is undefined');
  assert(Array.isArray(result.prices), 'Giaxanghomnay prices must be an array');
  assert(result.prices.length > 0, 'Giaxanghomnay must return at least one product');
  assert(typeof result.scrapedAt === 'string', 'Giaxanghomnay scrapedAt must be a string');

  return {
    name: 'scrapers/giaxanghomnay.smoke',
    ok: true,
    count: result.prices.length,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { run };

if (require.main === module) {
  run()
    .then((summary) => {
      console.log(`[PASS] ${summary.name} - ${summary.count} items (${summary.durationMs}ms)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FAIL] scrapers/giaxanghomnay.smoke:', err.message);
      process.exit(1);
    });
}

