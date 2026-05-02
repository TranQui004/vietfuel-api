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

function isIsoDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function toDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function assertDateMeta(meta, endpointName) {
  assert(meta, `${endpointName} meta is missing`);

  if (meta.priceDate === null || meta.priceDate === undefined) {
    assert(
      meta.priceDateDisplay === null || meta.priceDateDisplay === undefined,
      `${endpointName} priceDateDisplay must be null when priceDate is null`
    );
    return;
  }

  assert(isIsoDate(meta.priceDate), `${endpointName} priceDate must be ISO YYYY-MM-DD`);
  assert.equal(
    meta.priceDateDisplay,
    toDisplay(meta.priceDate),
    `${endpointName} priceDateDisplay must match DD/MM/YYYY of priceDate`
  );
}

function assertDateProvenance(meta, endpointName, sourceName) {
  if (sourceName === 'pvoil') {
    assert(meta.priceDateSource, `${endpointName} must include meta.priceDateSource`);
    assert(
      ['pvoil-dropdown', 'pvoil-text', 'table-header', 'petrolimex-reference-fallback', 'source'].includes(meta.priceDateSource),
      `${endpointName} priceDateSource is invalid`
    );
    if (meta.priceAnnouncedAt !== null && meta.priceAnnouncedAt !== undefined) {
      assert(/^\d{1,2}:\d{2}(:\d{2})?$/.test(meta.priceAnnouncedAt), `${endpointName} priceAnnouncedAt must be HH:mm or HH:mm:ss`);
    }
  }

  if (sourceName === 'mipec') {
    assert(meta.priceDateSource, `${endpointName} must include meta.priceDateSource`);
    assert(
      ['mipec-news', 'gxhn-fallback', 'petrolimex-reference-fallback', 'source'].includes(meta.priceDateSource),
      `${endpointName} priceDateSource is invalid`
    );
  }
}

async function run(baseUrl = process.env.API_BASE_URL || 'http://localhost:3000') {
  const startedAt = Date.now();

  const health = await fetchJson(`${baseUrl}/api/health`);
  assert.equal(health.res.status, 200, '/api/health must return 200');

  const nationalSources = health.json?.endpoints?.nationalSources || [];
  assert(Array.isArray(nationalSources), 'health.endpoints.nationalSources must be an array');
  assert(nationalSources.length > 0, 'health.endpoints.nationalSources must not be empty');

  const def = await fetchJson(`${baseUrl}/api/fuel-prices`);
  assert.equal(def.res.status, 200, '/api/fuel-prices must return 200');
  assertDateMeta(def.json.meta, '/api/fuel-prices');

  for (const src of nationalSources) {
    const sourceResp = await fetchJson(`${baseUrl}/api/fuel-prices/${src}`);
    assert.equal(sourceResp.res.status, 200, `/api/fuel-prices/${src} must return 200`);
    assertDateMeta(sourceResp.json.meta, `/api/fuel-prices/${src}`);
    assertDateProvenance(sourceResp.json.meta, `/api/fuel-prices/${src}`, src);
  }

  return {
    name: 'api/price-date.consistency',
    ok: true,
    sourceCount: nationalSources.length,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { run };

if (require.main === module) {
  run()
    .then((summary) => {
      console.log(`[PASS] ${summary.name} - ${summary.sourceCount} sources (${summary.durationMs}ms)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FAIL] api/price-date.consistency:', err.message);
      process.exit(1);
    });
}

