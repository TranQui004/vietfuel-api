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

function isIsoDateTime(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}

function parseIsoDate(v) {
  if (!isIsoDate(v)) return null;
  const t = Date.parse(`${v}T00:00:00.000Z`);
  return Number.isNaN(t) ? null : t;
}

function daysDiff(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(a - b) / ms);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function assertPriceItemShape(item, endpointName, idx) {
  assert(item && typeof item === 'object', `${endpointName} item ${idx} must be object`);
  assert(typeof item.name === 'string' && item.name.trim(), `${endpointName} item ${idx} name is required`);
  assert(typeof item.unit === 'string' && item.unit.trim(), `${endpointName} item ${idx} unit is required`);

  const hasNumericRegion1 = typeof item.region1 === 'number' && item.region1 > 0;
  const hasNumericRegion2 = typeof item.region2 === 'number' && item.region2 > 0;
  const hasNumericPrice = typeof item.price === 'number' && item.price > 0;

  assert(
    hasNumericRegion1 || hasNumericRegion2 || hasNumericPrice,
    `${endpointName} item ${idx} must have at least one positive numeric price field`
  );
}

async function run(baseUrl = process.env.API_BASE_URL || 'http://localhost:3000') {
  const startedAt = Date.now();

  const health = await fetchJson(`${baseUrl}/api/health`);
  assert.equal(health.res.status, 200, '/api/health must return 200');
  assert.equal(health.json.success, true, '/api/health success must be true');

  const sources = health.json?.endpoints?.nationalSources;
  assert(Array.isArray(sources) && sources.length > 0, 'health endpoints.nationalSources must be non-empty array');

  const todayUtc = new Date();
  const todayIso = `${todayUtc.getUTCFullYear()}-${String(todayUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUtc.getUTCDate()).padStart(2, '0')}`;
  const todayTs = parseIsoDate(todayIso);

  const perSource = [];

  for (const src of sources) {
    const endpoint = `${baseUrl}/api/fuel-prices/${src}`;
    const r = await fetchJson(endpoint);

    assert.equal(r.res.status, 200, `${endpoint} must return 200`);
    assert.equal(r.json.success, true, `${endpoint} success must be true`);

    const meta = r.json.meta || {};
    const data = r.json.data;

    assert.equal(typeof meta.source, 'string', `${endpoint} meta.source is required`);
    assert.equal(typeof meta.sourceUrl, 'string', `${endpoint} meta.sourceUrl is required`);
    assert(isIsoDateTime(meta.scrapedAt), `${endpoint} meta.scrapedAt must be ISO datetime`);
    assert(Array.isArray(data) && data.length > 0, `${endpoint} data must be non-empty array`);
    assert.equal(meta.totalItems, data.length, `${endpoint} meta.totalItems must equal data.length`);

    data.forEach((item, idx) => assertPriceItemShape(item, endpoint, idx));

    if (meta.priceDate !== null && meta.priceDate !== undefined) {
      assert(isIsoDate(meta.priceDate), `${endpoint} meta.priceDate must be ISO date`);
      const pd = parseIsoDate(meta.priceDate);
      assert(pd !== null, `${endpoint} meta.priceDate cannot be parsed`);
      assert(pd <= todayTs, `${endpoint} meta.priceDate cannot be in the future`);
      assert(daysDiff(pd, todayTs) <= 14, `${endpoint} meta.priceDate is too old (>14 days)`);
      assert.equal(
        meta.priceDateDisplay,
        `${meta.priceDate.slice(8, 10)}/${meta.priceDate.slice(5, 7)}/${meta.priceDate.slice(0, 4)}`,
        `${endpoint} meta.priceDateDisplay mismatch`
      );
    }

    if (meta.priceAnnouncedAt !== null && meta.priceAnnouncedAt !== undefined) {
      assert(/^\d{1,2}:\d{2}(:\d{2})?$/.test(meta.priceAnnouncedAt), `${endpoint} meta.priceAnnouncedAt invalid`);
    }

    perSource.push({
      source: src,
      priceDate: meta.priceDate || null,
      dateSource: meta.priceDateSource || null,
      announcedAt: meta.priceAnnouncedAt || null,
      items: data.length,
    });
  }

  const def = await fetchJson(`${baseUrl}/api/fuel-prices`);
  assert.equal(def.res.status, 200, '/api/fuel-prices must return 200');
  assert.equal(def.json.success, true, '/api/fuel-prices success must be true');
  assert(Array.isArray(def.json.data), '/api/fuel-prices data must be an array');
  assert(def.json.data.length > 0, '/api/fuel-prices data must not be empty');
  assert(Array.isArray(def.json.meta?.dataSources), '/api/fuel-prices meta.dataSources must be an array');
  assert.equal(def.json.meta.totalItems, def.json.data.length, '/api/fuel-prices totalItems mismatch');

  const missing = sources.filter((s) => !def.json.meta.dataSources.includes(s));
  assert.equal(missing.length, 0, `/api/fuel-prices missing sources: ${missing.join(', ')}`);

  return {
    name: 'api/all-sources.integrity',
    ok: true,
    sourceCount: sources.length,
    totalDefaultItems: def.json.data.length,
    perSource,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { run };

if (require.main === module) {
  run()
    .then((summary) => {
      console.log(
        `[PASS] ${summary.name} - ${summary.sourceCount} sources, ${summary.totalDefaultItems} default items (${summary.durationMs}ms)`
      );
      summary.perSource.forEach((s) => {
        console.log(
          `  - ${s.source}: items=${s.items}, priceDate=${s.priceDate}, dateSource=${s.dateSource}, announcedAt=${s.announcedAt}`
        );
      });
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FAIL] api/all-sources.integrity:', err.message);
      process.exit(1);
    });
}

