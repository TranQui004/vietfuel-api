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
 * [SCRAPER] - SAIGON PETRO
 * ========================================================================== */
async function scrapeSaigonPetro() {
  const url = 'https://saigonpetro.com.vn/ban-le-xang-dau';
  const start = Date.now();
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    await page.waitForTimeout(2000); // Đợi để bảng render
    const rawData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tr');
      const results = [];
      let dateFound = null;
      for (const row of rows) {
        if (!dateFound && row.innerText.includes('Kể Từ')) {
           const match = row.innerText.match(/Ngày (\d{1,2}) Tháng (\d{1,2}) Năm (\d{4})/i);
           if (match) dateFound = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
        }
        const cls = row.querySelectorAll('td');
        if (cls.length >= 3) {
          results.push({ name: cls[1].innerText.trim(), rawPrice: cls[2].innerText.trim() });
        }
      }
      const bodyText = document.body.innerText || '';
      const contextualDate = bodyText.match(/Gi[aá]\s*b[aá]n\s*lẻ\s*xăng,?\s*d[aầ]u[\s\S]{0,260}?(?:Kể\s*Từ|Kể\s*từ|Gi[aá]\s*điều\s*chỉnh\s*từ)[^\n]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i)
        || bodyText.match(/(?:Kể\s*Từ|Kể\s*từ)[^\n]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
      const dateCandidates = Array.from(bodyText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map((m) => m[1]);

      return {
        priceRows: results,
        dateTxt: dateFound,
        contextualDateTxt: contextualDate ? contextualDate[1] : null,
        dateCandidates,
      };
    });

    const prices = deduplicate(rawData.priceRows.map(p => ({
        name: p.name,
        region1: null,
        region2: null,
        price: parsePrice(p.rawPrice),
        unit: 'VND/lít'
    })).filter(p => !!p.price && /xăng|dầu|ron|do/i.test(p.name)));

    if (!prices.length) throw new Error("Empty dataset from SaigonPetro");
    const strictDate = toISODate(rawData.dateTxt || rawData.contextualDateTxt);
    const fallbackDate = pickMostLikelyPriceDate(rawData.dateCandidates, { maxAgeDays: 45, minYear: 2020 });
    const priceDate = strictDate || fallbackDate;
    logger.info(`[Scraper:SaigonPetro] Cào thành công. ${prices.length} items. priceDate=${priceDate}`);
    return {
      prices,
      scrapedAt: new Date().toISOString(),
      source: url,
      priceDate,
      priceDateSource: strictDate ? 'saigonpetro-context' : (fallbackDate ? 'saigonpetro-fallback' : null),
    };
  } catch (err) {
    logger.error(`[Scraper:SaigonPetro] Error: ${err.message}`);
    throw err;
  } finally {
    await browser.close().catch(() => {});
  }
}


module.exports = { scrapeSaigonPetro };

