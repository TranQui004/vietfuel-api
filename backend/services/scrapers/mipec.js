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
 * [SCRAPER] - MIPEC
 * Công ty Xăng dầu Quân đội.
 * ========================================================================== */

/**
 * Thu thập dữ liệu từ Mipec.
 * Cào giá ở trang độc lập nhưng phải cào tin tức mới để lấy ngày hiệu lực.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapeMipec() {
  logger.info('[Scraper:Mipec] Bắt đầu cào dữ liệu...');
  const start = Date.now();
  const { browser, context } = await createBrowser();

  try {
    const page = await context.newPage();
    await page.goto(config.scraper.mipecUrl, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr')).slice(1);
      return rows.map((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return null;
        return { name: cells[0].textContent.trim(), r1: cells[1].textContent.trim(), r2: cells[2].textContent.trim() };
      }).filter((i) => i && i.name && /\d/.test(i.r1));
    });

    // Mipec thường không hiển thị ngày trên trang giá — lấy từ tin tức, fallback ngày điều hành chung.
    let priceDateRaw = null;
    let priceDateSource = null;
    try {
      await page.goto('https://www.mipec.com.vn/blogs/tin-tuc', { waitUntil: 'domcontentloaded', timeout: 8000 });
      priceDateRaw = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const m = text.match(/ĐIỀU CHỈNH GIÁ XĂNG DẦU.*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
        return m ? m[1] : null;
      });
      if (priceDateRaw) priceDateSource = 'mipec-news';
    } catch (e) { logger.debug(`[Scraper:Mipec] Không lấy được ngày từ tin tức: ${e.message}`); }

    if (!priceDateRaw) {
      try {
        const { bodyText } = await fetchGXHNPage('https://giaxanghomnay.com/');
        const m = bodyText.match(/Gi[aá].{0,40}x[aă]ng.{0,40}(\d{1,2}\/\d{1,2}\/\d{4})/i) || bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (m) {
          priceDateRaw = m[1];
          priceDateSource = 'gxhn-fallback';
        }
      } catch (e) {
        logger.debug(`[Scraper:Mipec] Không lấy được fallback ngày từ GXHN: ${e.message}`);
      }
    }

    await browser.close();

    const prices = deduplicate(result.map((p) => ({
      name: p.name,
      region1: parsePrice(p.r1),
      region2: parsePrice(p.r2),
      price: null,
      unit: 'VND/lít',
    })));

    const priceDate = toISODate(priceDateRaw);
    logger.info(`[Scraper:Mipec] Cào được ${prices.length} sản phẩm. priceDate=${priceDate}, source=${priceDateSource} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return {
      prices,
      scrapedAt: new Date().toISOString(),
      source: config.scraper.mipecUrl,
      priceDate,
      priceDateSource: priceDateSource || null,
    };
  } catch (err) {
    await browser.close().catch(() => {});
    logger.error(`[Scraper:Mipec] Lỗi: ${err.message}`);
    throw err;
  }
}


module.exports = { scrapeMipec };

