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
 * [TEST] - Smoke Test PVOil
 * Mục đích: Đảm bảo Scraper PVOil hoạt động và trả tự động dữ liệu chuẩn.
 * ========================================================================== */

const assert = require('assert');
const { scrapePVOil } = require('../../services/scraper');

async function run() {
  const startedAt = Date.now();
  const result = await scrapePVOil();

  assert(result, 'PVOil result is undefined');
  assert(Array.isArray(result.prices), 'PVOil prices must be an array');
  assert(result.prices.length > 0, 'PVOil must return at least one product');
  assert(typeof result.scrapedAt === 'string', 'PVOil scrapedAt must be a string');

  return {
    name: 'scrapers/pvoil.smoke',
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
      console.error('[FAIL] scrapers/pvoil.smoke:', err.message);
      process.exit(1);
    });
}

