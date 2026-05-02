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
 * [SCRAPER] - PETROTIMES
 * ========================================================================== */
async function scrapePetrotimes() {
  const url = 'https://petrotimesgroup.com/site/get-petro';
  const start = Date.now();
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    const rawResults = await page.evaluate(() => {
       const res = [];
       const rows = document.querySelectorAll('.table-item');
       for (const row of rows) {
          const ps = row.querySelectorAll('p');
          if (ps.length >= 3) {
             const name = ps[0].innerText.trim();
             // Bỏ qua header row
             if (/Sản phẩm/i.test(name)) continue;
             res.push({
               name,
               p1: ps[1].innerText.trim(),
               p2: ps[2].innerText.trim()
             });
          }
       }
       return res;
    });

    // Chuẩn hoá tên sản phẩm Petrotimes → format chuẩn
    const normalizePetrotimesName = (n) => {
      // "DO 0,05S-II" → "Dầu DO 0,05S-II"
      if (/^DO\s/i.test(n)) return 'Dầu ' + n;
      // "Xăng RON95-III" → "Xăng RON 95-III"
      let result = n.replace(/RON(\d)/i, 'RON $1');
      // "Xăng E5 RON92-II" hay "Xăng RON 92" → "Xăng E5 RON 92-II"
      result = result.replace(/Xăng\s+RON\s+92/i, 'Xăng E5 RON 92');
      return result;
    };

    const parsedObj = deduplicate(rawResults.map(r => ({
        name: normalizePetrotimesName(r.name),
        region1: parsePrice(r.p1),
        region2: parsePrice(r.p2) || null,
        price: null,
        unit: 'VND/lít'
    })).filter(r => r.region1 && /xăng|dầu|do|ron/i.test(r.name)));

    if (!parsedObj.length) throw new Error("Empty petrotimes prices");
    logger.info(`[Scraper:Petrotimes] Cào thành công. ${parsedObj.length} items. (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return { prices: parsedObj, scrapedAt: new Date().toISOString(), source: 'https://petrotimesgroup.com', priceDate: null };
  } catch (err) {
    logger.error(`[Scraper:Petrotimes] Lỗi: ${err.message}`);
    throw err;
  } finally {
        await browser.close().catch(() => {});
  }
}



module.exports = { scrapePetrotimes };

