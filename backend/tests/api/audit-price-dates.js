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

const http = require('http');

const DIRECT_SCRAPE_SOURCES = [
  'petrolimex',
  'pvoil',
  'mipec',
  'comeco',
  'saigonpetro',
  'petrotimes',
  'webgia',
  'giaxanghomnay',
];

function fetchSourceMeta(source) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000/api/fuel-prices/${source}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const meta = json.meta || {};
          resolve({
            source,
            ok: !!json.success,
            statusCode: res.statusCode,
            priceDate: meta.priceDate || null,
            priceDateSource: meta.priceDateSource || null,
            priceAnnouncedAt: meta.priceAnnouncedAt || null,
            scrapedAt: meta.scrapedAt || null,
            sourceUrl: meta.sourceUrl || null,
          });
        } catch {
          resolve({ source, ok: false, statusCode: res.statusCode, error: 'PARSE_ERROR' });
        }
      });
    }).on('error', () => {
      resolve({ source, ok: false, statusCode: null, error: 'CONNECTION_ERROR' });
    });
  });
}

function mostCommonDate(rows) {
  const counts = new Map();
  rows.forEach((r) => {
    if (!r.priceDate) return;
    counts.set(r.priceDate, (counts.get(r.priceDate) || 0) + 1);
  });
  if (!counts.size) return null;

  let winner = null;
  let maxCount = -1;
  for (const [date, count] of counts.entries()) {
    if (count > maxCount) {
      winner = date;
      maxCount = count;
    }
  }
  return { date: winner, count: maxCount, totalWithDate: [...counts.values()].reduce((a, b) => a + b, 0) };
}

function formatCell(v) {
  if (v === null || v === undefined || v === '') return '-';
  return String(v);
}

function printTable(rows) {
  const headers = ['source', 'priceDate', 'priceDateSource', 'announcedAt', 'status'];
  const lines = rows.map((r) => [
    formatCell(r.source),
    formatCell(r.priceDate),
    formatCell(r.priceDateSource),
    formatCell(r.priceAnnouncedAt),
    r.ok ? 'OK' : `ERR(${formatCell(r.error || r.statusCode)})`,
  ]);

  const widths = headers.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i].length)));
  const mk = (cols) => cols.map((c, i) => c.padEnd(widths[i], ' ')).join(' | ');

  console.log(mk(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));
  lines.forEach((l) => console.log(mk(l)));
}

async function main() {
  const rows = await Promise.all(DIRECT_SCRAPE_SOURCES.map(fetchSourceMeta));
  printTable(rows);

  const okRows = rows.filter((r) => r.ok);
  const baseline = mostCommonDate(okRows);
  const missingDate = okRows.filter((r) => !r.priceDate).map((r) => r.source);
  const mismatched = baseline
    ? okRows.filter((r) => r.priceDate && r.priceDate !== baseline.date).map((r) => ({ source: r.source, priceDate: r.priceDate }))
    : [];

  console.log('\nSummary:');
  console.log(`- Sources checked: ${rows.length}`);
  console.log(`- Successful responses: ${okRows.length}`);
  if (baseline) {
    console.log(`- Baseline date (majority): ${baseline.date} (${baseline.count}/${baseline.totalWithDate})`);
  } else {
    console.log('- Baseline date (majority): N/A');
  }

  if (missingDate.length) {
    console.log(`- Missing priceDate: ${missingDate.join(', ')}`);
  } else {
    console.log('- Missing priceDate: none');
  }

  if (mismatched.length) {
    const txt = mismatched.map((x) => `${x.source}=${x.priceDate}`).join(', ');
    console.log(`- Date mismatches vs baseline: ${txt}`);
    process.exitCode = 2;
  } else {
    console.log('- Date mismatches vs baseline: none');
  }

  if (rows.some((r) => !r.ok)) {
    process.exitCode = process.exitCode || 1;
  }
}

main();

