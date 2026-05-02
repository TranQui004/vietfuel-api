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
const { scrapeSaigonPetro } = require('../../services/scraper');

async function run() {
  const startedAt = Date.now();
  const result = await scrapeSaigonPetro();

  assert(result, 'SaigonPetro result is undefined');
  assert(Array.isArray(result.prices), 'SaigonPetro prices must be an array');
  assert(result.prices.length > 0, 'SaigonPetro must return at least one product');
  assert(typeof result.scrapedAt === 'string', 'SaigonPetro scrapedAt must be a string');

  return {
    name: 'scrapers/saigonpetro.smoke',
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
      console.error('[FAIL] scrapers/saigonpetro.smoke:', err.message);
      process.exit(1);
    });
}

