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

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function run(baseUrl = process.env.API_BASE_URL || 'http://localhost:3000') {
  const startedAt = Date.now();

  const health = await fetchJson(`${baseUrl}/api/health`);
  assert.equal(health.res.status, 200, '/api/health must return 200');
  assert.equal(health.json.success, true, '/api/health success must be true');

  const def = await fetchJson(`${baseUrl}/api/fuel-prices`);
  assert.equal(def.res.status, 200, '/api/fuel-prices must return 200');
  assert.equal(def.json.success, true, '/api/fuel-prices success must be true');
  assert(Array.isArray(def.json.data), '/api/fuel-prices data must be an array');
  assert(def.json.data.length > 0, '/api/fuel-prices data must not be empty');
  assert(Array.isArray(def.json.meta?.dataSources), 'meta.dataSources must be an array');

  const source = await fetchJson(`${baseUrl}/api/fuel-prices/pvoil`);
  assert.equal(source.res.status, 200, '/api/fuel-prices/:source must return 200');
  assert.equal(source.json.success, true, '/api/fuel-prices/:source success must be true');
  assert(Array.isArray(source.json.data), '/api/fuel-prices/:source data must be an array');

  return {
    name: 'api/default-endpoint.smoke',
    ok: true,
    defaultItems: def.json.data.length,
    sourceCount: def.json.meta?.dataSources?.length || 0,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { run };

if (require.main === module) {
  run()
    .then((summary) => {
      console.log(
        `[PASS] ${summary.name} - ${summary.defaultItems} items, ${summary.sourceCount} sources (${summary.durationMs}ms)`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FAIL] api/default-endpoint.smoke:', err.message);
      process.exit(1);
    });
}

