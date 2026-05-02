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

/* ==========================================================================
 * [SCRAPER] - PETROLIMEX
 * Bảng giá chính thức chuẩn xác và lớn nhất thị trường.
 * ========================================================================== */

const { parsePrice, deduplicate, toISODate, pickMostLikelyPriceDate, createBrowser, fetchGXHNPage, parseGXHNTable } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Trích xuất bảng giá từ Tập đoàn Xăng dầu Việt Nam (Petrolimex).
 * Thu thập được dữ liệu 2 Vùng (Vùng 1 & Vùng 2).
 *
 * @returns {Promise<ScraperResult>} - Đối tượng chuẩn chứa mảng giá xăng và ngày hiệu lực.
 * @throws Sẽ ném ra lỗi nếu trang web từ chối truy cập hoặc có sự thay đổi DOM.
 */
function parsePetrolimexDate(raw) {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const [, , d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return toISODate(raw);
}


async function scrapePetrolimex() {
  const mirrors = [
    config.scraper.petrolimexUrl,
    'https://kv2.petrolimex.com.vn',
    'https://saigon.petrolimex.com.vn',
    'https://vungtau.petrolimex.com.vn'
  ];
  let lastError;

  for (let i = 0; i < mirrors.length; i++) {
    const url = mirrors[i];
    const start = Date.now();
    const { browser, context } = await createBrowser();
    
    try {
      logger.info(`[Scraper:Petrolimex] Bắt đầu cào dữ liệu từ ${url} (Lần thử ${i + 1}/${mirrors.length})...`);
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.scraper.timeout,
      });

      // Mở popup giá bán lẻ
      await page.evaluate(() => {
        const btn = document.querySelector('a[href*="petro-price"], .f-price-trigger, [data-target*="price"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(2500);

      const rawPrices = await page.evaluate(() => {
        const results = [];
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          const sampleText = [...rows].slice(0, 5).map((r) => r.textContent).join(' ').toLowerCase();
          if (!sampleText.includes('vùng') && !sampleText.includes('xăng') && !sampleText.includes('ron')) continue;

          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) continue;
            const name = cells[0]?.textContent?.trim();
            if (!name || /sản phẩm|mặt hàng|tên/i.test(name)) continue;

            const r1Raw = cells[1]?.textContent?.trim();
            const r2Raw = cells[2]?.textContent?.trim();
            if (!r1Raw || !/\d/.test(r1Raw)) continue;
            results.push({ name, r1: r1Raw, r2: r2Raw || null });
          }
          if (results.length > 0) break;
        }
        return results;
      });

      // Trích xuất ngày — ưu tiên selector chính xác trong popup
      let priceDateRaw = await page.evaluate(() => {
        const sel = ['.f-prices .footer .time', '.f-prices .time', '.petro-price-time', '.price-date'];
        for (const s of sel) {
          const el = document.querySelector(s);
          if (el) return el.textContent.trim();
        }
        // Fallback: tìm trong toàn trang — mẫu "HH:mm - D/M/YYYY" hoặc "cập nhật lúc"
        const text = document.body.innerText || '';
        const m = text.match(/(?:c[aâ]p nh[aậ]t l[uú]c|gi[aá] c[uủ]a petrolimex c[aâ]p nh[aậ]t l[uú]c)\s*(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (m) return m[1];
        const m2 = text.match(/(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4})/);
        return m2 ? m2[1] : null;
      });

      await browser.close();

      // Nếu không lấy được ngày từ Petrolimex, dùng GiaXangHomNay làm fallback
      if (!priceDateRaw) {
        logger.debug('[Scraper:Petrolimex] Không tìm thấy ngày, thử GiaXangHomNay...');
        try {
          const { bodyText } = await fetchGXHNPage('https://giaxanghomnay.com/');
          const m = bodyText.match(/Gi[aá] c[uủ]a Petrolimex c[aâ]p nh[aậ]t.{0,30}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
          if (m) priceDateRaw = m[1];
          if (!priceDateRaw) {
            const m2 = bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            if (m2) priceDateRaw = m2[1];
          }
        } catch (e) { logger.debug(`[Scraper:Petrolimex] GiaXangHomNay fallback lỗi: ${e.message}`); }
      }

      const priceDate = parsePetrolimexDate(priceDateRaw);

      if (rawPrices.length === 0) {
        throw new Error('Không tìm thấy dữ liệu giá. Cấu trúc DOM có thể đã thay đổi.');
      }

      const prices = deduplicate(
        rawPrices.map((p) => ({
          name: p.name,
          region1: parsePrice(p.r1),
          region2: parsePrice(p.r2),
          price: null,
          unit: 'VND/lít',
        })).filter((p) => p.region1 !== null)
      );

      logger.info(`[Scraper:Petrolimex] Cào thành công từ ${url}. Cào được ${prices.length} sản phẩm. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
      return { prices, scrapedAt: new Date().toISOString(), source: url, priceDate }; // Note internal source url

    } catch (err) {
      lastError = err;
      await browser.close().catch(() => {});
      
      if (i < mirrors.length - 1) {
        logger.warn(`[Scraper:Petrolimex] Thử lần ${i + 1} (${url}) thất bại: ${err.message}. Chuyển sang mirror tiếp theo...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  logger.error(`[Scraper:Petrolimex] Thất bại hoàn toàn sau ${mirrors.length} lần thử các URLs. Lỗi cuối: ${lastError.message}`);
  throw lastError;
}


module.exports = { scrapePetrolimex };

