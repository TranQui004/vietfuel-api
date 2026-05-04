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
 * [SCRAPER] - PETROTIMES
 * Chiến lược 2 tầng (tối ưu RAM):
 *   1. [PRIMARY] Gọi thẳng API nội bộ /site/get-petro (trả về HTML) bằng
 *      node-fetch + cheerio — không cần browser.
 *      Kỹ thuật tham khảo từ bài blog "Xây dựng Vietfuel API phiên bản ít RAM"
 *      của tác giả toidicakhia (https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram).
 *   2. [FALLBACK] Playwright headless nếu endpoint thay đổi.
 * ========================================================================== */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { parsePrice, deduplicate, createBrowser } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

// Endpoint nội bộ Petrotimes — trả về HTML bảng giá trực tiếp, không cần JS.
const PETROTIMES_API_URL = 'https://petrotimesgroup.com/site/get-petro';
const FETCH_TIMEOUT_MS = 15000;

const normalizePetrotimesName = (n) => {
  if (/^DO\s/i.test(n)) return 'Dầu ' + n;
  let result = n.replace(/RON(\d)/i, 'RON $1');
  result = result.replace(/Xăng\s+RON\s+92/i, 'Xăng E5 RON 92');
  return result;
};

/**
 * Tầng 1: fetch API nội bộ Petrotimes + parse cheerio.
 */
async function scrapeViaHttp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(PETROTIMES_API_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VietFuelBot/1.0 (non-profit; github.com/TranQui004/vietfuel-api)',
        'Accept': 'text/html,*/*',
        'Referer': 'https://petrotimesgroup.com/',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    $('.table-item').each((_, el) => {
      const ps = $(el).find('p');
      if (ps.length >= 3) {
        const name = ps.eq(0).text().trim();
        if (/Sản phẩm/i.test(name)) return;
        results.push({
          name,
          p1: ps.eq(1).text().trim(),
          p2: ps.eq(2).text().trim(),
        });
      }
    });
    return results;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tầng 2: Fallback Playwright.
 */
async function scrapeViaBrowser() {
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();
    await page.goto(PETROTIMES_API_URL, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    return await page.evaluate(() => {
      const res = [];
      const rows = document.querySelectorAll('.table-item');
      for (const row of rows) {
        const ps = row.querySelectorAll('p');
        if (ps.length >= 3) {
          const name = ps[0].innerText.trim();
          if (/Sản phẩm/i.test(name)) continue;
          res.push({ name, p1: ps[1].innerText.trim(), p2: ps[2].innerText.trim() });
        }
      }
      return res;
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

async function scrapePetrotimes() {
  const start = Date.now();
  let rawResults;
  try {
    logger.info('[Scraper:Petrotimes] Thử HTTP fetch nội bộ API (không cần browser)...');
    rawResults = await scrapeViaHttp();
    logger.info('[Scraper:Petrotimes] HTTP fetch thành công.');
  } catch (httpErr) {
    logger.warn(`[Scraper:Petrotimes] HTTP thất bại (${httpErr.message}), chuyển sang Playwright...`);
    rawResults = await scrapeViaBrowser();
  }

  const parsedObj = deduplicate(rawResults.map(r => ({
    name: normalizePetrotimesName(r.name),
    region1: parsePrice(r.p1),
    region2: parsePrice(r.p2) || null,
    price: null,
    unit: 'VND/lít',
  })).filter(r => r.region1 && /xăng|dầu|do|ron/i.test(r.name)));

  if (!parsedObj.length) throw new Error('Empty petrotimes prices');
  logger.info(`[Scraper:Petrotimes] Xong. ${parsedObj.length} items. (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return { prices: parsedObj, scrapedAt: new Date().toISOString(), source: 'https://petrotimesgroup.com', priceDate: null };
}

module.exports = { scrapePetrotimes };
