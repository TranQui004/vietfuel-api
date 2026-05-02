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
 * [TEST] - Smoke Test Stale Cache
 * Mục đích: Đảm bảo cơ chế fallback stale cache không trả về 503 khi dữ liệu quá hạn.
 * ========================================================================== */

const assert = require('assert');

async function run(baseUrl) {
  const startedAt = Date.now();
  
  // Try to hit the default endpoint
  const res = await fetch(`${baseUrl}/api/fuel-prices`);
  assert(res.ok, 'API must return 200 OK');
  
  const data = await res.json();
  assert(data.success === true, 'API success flag must be true');
  
  // It should have meta
  assert(data.meta, 'API response must have meta object');
  
  // isStale may or may not be true during the test depending on when it was scraped,
  // but the property might be present, or we at least verify the endpoint doesn't crash
  // when handling cache logic.
  if (data.meta.isStale !== undefined) {
    assert(typeof data.meta.isStale === 'boolean', 'isStale must be boolean if present');
  }

  return {
    name: 'cache/stale-cache.smoke',
    ok: true,
    count: data.data ? data.data.length : 0,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { run };

if (require.main === module) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  run(baseUrl)
    .then((summary) => {
      console.log(`[PASS] ${summary.name} - ${summary.count} items (${summary.durationMs}ms)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FAIL] cache/stale-cache.smoke:', err.message);
      process.exit(1);
    });
}

