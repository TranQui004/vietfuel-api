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

const { parsePrice, deduplicate, toISODate, pickMostLikelyPriceDate, createBrowser, fetchGXHNPage, parseGXHNTable } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

/* ==========================================================================
 * [SCRAPER] - WEBGIA
 * Trang tổng hợp (Backup mirror cho Petrolimex).
 * ========================================================================== */

/**
 * Quét dữ liệu giá Petrolimex đã được WebGia ghi chép lại.
 * Dùng làm đối soát phụ.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapeWebGia() {
  logger.info('[Scraper:WebGia] Bắt đầu cào dữ liệu...');
  const start = Date.now();
  const { browser, context } = await createBrowser();

  try {
    const page = await context.newPage();
    await page.goto(config.scraper.webgiaUrl, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    await page.waitForTimeout(2000);

    const tablesData = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table')).map((t) => t.innerText)
    );

    const priceDateRaw = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const m = text.match(/Cập nhật lúc\s*(\d{1,2}:\d{2}(?::\d{2})?\s*\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (m) return m[1].trim();
      const m2 = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      return m2 ? m2[1] : null;
    });

    await browser.close();

    const results = [];
    for (const text of tablesData) {
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
      if (text.toLowerCase().includes('vùng 1') && text.toLowerCase().includes('sản phẩm')) {
        for (const line of lines) {
          const parts = line.split(/\t|\s{2,}/);
          if (parts.length >= 3) {
            const name = parts[0].trim();
            const r1 = parts[1].trim();
            const r2 = parts[2].trim();
            if (/xăng|dầu|ron|do |mazut|hỏa/i.test(name) && /\d/.test(r1)) {
              results.push({ name, r1, r2 });
            }
          }
        }
        if (results.length > 0) break;
      }
    }

    const prices = deduplicate(results.map((p) => ({
      name: p.name,
      region1: parsePrice(p.r1),
      region2: parsePrice(p.r2),
      price: null,
      unit: 'VND/lít',
    })));

    // Trích xuất ngày từ chuỗi "HH:mm:ss D/M/YYYY" của WebGia
    const priceDate = toISODate(priceDateRaw?.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] || null);
    logger.info(`[Scraper:WebGia] Cào được ${prices.length} sản phẩm. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return { prices, scrapedAt: new Date().toISOString(), source: config.scraper.webgiaUrl, priceDate };
  } catch (err) {
    await browser.close().catch(() => {});
    logger.error(`[Scraper:WebGia] Lỗi: ${err.message}`);
    throw err;
  }
}


module.exports = { scrapeWebGia };

