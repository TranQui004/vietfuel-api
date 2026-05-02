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
 * [SCRAPER] - COMECO
 * ========================================================================== */
async function scrapeComeco() {
  const url = 'https://comeco.vn';
  const start = Date.now();
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    const { prices, priceDateRaw, dateCandidates } = await page.evaluate(() => {
        const results = [];
      const bodyText = document.body.innerText || '';
      const textBlocks = bodyText.split(/\n/);
        let currentName = "";
        for (let i = 0; i < textBlocks.length; i++) {
            const line = textBlocks[i].trim();
            if (line === "Xăng" || line === "Dầu") {
                currentName = line + " " + (textBlocks[i+1] ? textBlocks[i+1].trim() : "");
                i++;
            } else if (currentName && /^[\d.,]{5,}$/.test(line)) {
                results.push({ name: currentName, val: line });
                currentName = "";
            } else {
                currentName = "";
            }
        }
      // Ưu tiên ngày nằm trong block giá bán lẻ xăng dầu thay vì ngày tin tức/quan hệ cổ đông.
      const ctxMatch = bodyText.match(/Gi[aá]\s*b[aá]n\s*lẻ\s*xăng\s*d[aầ]u[\s\S]{0,300}?Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i)
        || bodyText.match(/Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
      const priceDateRaw = ctxMatch ? ctxMatch[1] : null;

      const dateCandidates = Array.from(bodyText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map((m) => m[1]);
      return { prices: results, priceDateRaw, dateCandidates };
    });
    
    let stdPrices = deduplicate(prices.map(p => ({
        name: p.name,
        region1: null, region2: null,
        price: parsePrice(p.val),
        unit: 'VND/lít'
    })));
    
    if (!stdPrices.length) throw new Error("Empty comeco prices");
    
    const strictPriceDate = toISODate(priceDateRaw);
    const fallbackPriceDate = pickMostLikelyPriceDate(dateCandidates, { maxAgeDays: 45, minYear: 2020 });
    const priceDate = strictPriceDate || fallbackPriceDate;

    logger.info(`[Scraper:Comeco] Cào thành công. ${stdPrices.length} items. priceDate=${priceDate || 'null'} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return { prices: stdPrices, scrapedAt: new Date().toISOString(), source: url, priceDate };
  } catch (err) {
    logger.error(`[Scraper:Comeco] Lỗi: ${err.message}`);
    throw err;
  } finally {
        await browser.close().catch(() => {});
  }
}


module.exports = { scrapeComeco };

