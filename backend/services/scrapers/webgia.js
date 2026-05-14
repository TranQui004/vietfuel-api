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
 * [SCRAPER] - WEBGIA (HTTP-first, Playwright-free)
 * Trang tổng hợp giá Petrolimex (Backup mirror).
 *
 * Kỹ thuật: HTTP fetch + cheerio parse table tĩnh.
 * WebGia render SSR → tables có sẵn trong HTML response.
 * ========================================================================== */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { parsePrice, deduplicate, toISODate, BOT_UA } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  'X-Bot-Info': 'VietFuelBot non-profit; github.com/TranQui004/vietfuel-api',
};

/**
 * Quét dữ liệu giá Petrolimex đã được WebGia ghi chép lại.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapeWebGia() {
  logger.info('[Scraper:WebGia] Bắt đầu cào dữ liệu (HTTP)...');
  const start = Date.now();

  const r = await fetch(config.scraper.webgiaUrl, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} từ WebGia`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const results = [];

  // WebGia: cấu trúc bảng đặc biệt
  // - Tên sản phẩm nằm trong các <th> (sau 3 th đầu là header)
  // - Giá nằm trong <td> của các row tiếp theo theo thứ tự tương ứng
  $('table').each((_, table) => {
    if (results.length > 0) return;
    const headers = $(table).find('th').map((_, el) => $(el).text().trim()).get();
    const hasProd = headers.some(h => /sản phẩm/i.test(h));
    const hasV1 = headers.some(h => /vùng 1/i.test(h));
    if (!hasProd || !hasV1) return;

    // Tên sản phẩm: các th sau 3 header đầu (Sản phẩm, Vùng 1, Vùng 2)
    const productNames = headers.slice(3).filter(h =>
      /xăng|dầu|ron|do\b|hỏa/i.test(h)
    );

    // Giá: các row có td (2 td = Vùng 1, Vùng 2)
    const priceRows = [];
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const r1 = $(cells[0]).text().trim();
      const r2 = $(cells[1]).text().trim();
      if (/[\d.,]+/.test(r1)) priceRows.push({ r1, r2 });
    });

    productNames.forEach((name, i) => {
      const row = priceRows[i];
      if (!row) return;
      results.push({ name, r1: row.r1, r2: row.r2 });
    });
  });

  // Ngày: lấy từ text body
  const bodyText = $('body').text();
  const dateMatch = bodyText.match(/Cập nhật lúc\s*(\d{1,2}:\d{2}(?::\d{2})?\s*\d{1,2}\/\d{1,2}\/\d{4})/i)
    || bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  const priceDateRaw = dateMatch ? dateMatch[1] : null;

  const prices = deduplicate(results.map(p => ({
    name: p.name,
    region1: parsePrice(p.r1),
    region2: parsePrice(p.r2),
    price: null,
    unit: 'VND/lít',
  })));

  const priceDate = toISODate(priceDateRaw?.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] || null);
  logger.info(`[Scraper:WebGia] ✅ Cào được ${prices.length} sản phẩm. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return { prices, scrapedAt: new Date().toISOString(), source: config.scraper.webgiaUrl, priceDate };
}


module.exports = { scrapeWebGia };
