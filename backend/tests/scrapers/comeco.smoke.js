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

const assert = require('assert');
const { scrapeComeco } = require('../../services/scraper');

async function run() {
  const startedAt = Date.now();
  const result = await scrapeComeco();

  assert(result, 'COMECO result is undefined');
  assert(Array.isArray(result.prices), 'COMECO prices must be an array');
  assert(result.prices.length > 0, 'COMECO must return at least one product');
  assert(typeof result.scrapedAt === 'string', 'COMECO scrapedAt must be a string');

  return {
    name: 'scrapers/comeco.smoke',
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
      console.error('[FAIL] scrapers/comeco.smoke:', err.message);
      process.exit(1);
    });
}

