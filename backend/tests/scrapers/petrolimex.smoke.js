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
 * [TEST] - Smoke Test Petrolimex
 * Mục đích: Đảm bảo Scraper Petrolimex hoạt động và trả tự động dữ liệu chuẩn.
 * ========================================================================== */

const assert = require('assert');
const { scrapePetrolimex } = require('../../services/scraper');

async function run() {
  const startedAt = Date.now();
  const result = await scrapePetrolimex();

  assert(result, 'Petrolimex result is undefined');
  assert(Array.isArray(result.prices), 'Petrolimex prices must be an array');
  assert(result.prices.length > 0, 'Petrolimex must return at least one product');
  assert(typeof result.scrapedAt === 'string', 'Petrolimex scrapedAt must be a string');

  return {
    name: 'scrapers/petrolimex.smoke',
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
      console.error('[FAIL] scrapers/petrolimex.smoke:', err.message);
      process.exit(1);
    });
}

