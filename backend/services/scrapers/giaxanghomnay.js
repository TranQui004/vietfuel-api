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
 * [SCRAPER] - GIAXANGHOMNAY (Trang Chủ)
 * Nguồn dữ liệu lớn nhất chuyên cho mục đích dự phòng và truy soát tỉnh thành.
 * ========================================================================== */

/**
 * Trích xuất bảng giá Petrolimex (bao gồm Vùng 1 & 2) hiện ở Trang Chủ GiaXangHomNay.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapeGiaxanghomnay() {
  logger.info('[Scraper:GiaXangHomNay] Bắt đầu cào dữ liệu trang chủ...');
  const start = Date.now();
  const { browser, context } = await createBrowser();

  try {
    const page = await context.newPage();
    await page.goto(config.scraper.giaxanghomnayUrl, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    await page.waitForTimeout(2000);

    // Đóng popup quảng cáo nếu có
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal .close, [aria-label="close"], button.close');
      if (closeBtn) closeBtn.click();
    });

    const { prices: rawPrices, priceDateRaw, dateCandidates } = await page.evaluate(() => {
      const prices = [];
      let priceDateRaw = null;

      // Tìm bảng Petrolimex (thường là bảng đầu tiên có 4+ cột gồm Tên, Tăng giảm, ..., Vùng 1, Vùng 2)
      const tables = Array.from(document.querySelectorAll('table'));
      for (const table of tables) {
        const headers = [...table.querySelectorAll('thead th, thead td')].map((h) => h.textContent.trim().toLowerCase());
        const hasRegion = headers.some((h) => h.includes('vùng') || h.includes('vu') );
        if (!hasRegion) continue;

        const rows = table.querySelectorAll('tbody tr');
        for (const row of rows) {
          const cells = [...row.querySelectorAll('td')];
          if (cells.length < 2) continue;
          const name = cells[0].textContent.trim();
          if (!/xăng|dầu|ron|do\b|diesel|hỏa/i.test(name)) continue;

          // Tìm ô giá Vùng 1 và Vùng 2 — thường là 2 ô cuối
          const r1Raw = cells[cells.length - 2]?.textContent?.trim();
          const r2Raw = cells[cells.length - 1]?.textContent?.trim();
          const r1 = parseInt((r1Raw || '').replace(/[.,\s]/g, ''), 10);
          const r2 = parseInt((r2Raw || '').replace(/[.,\s]/g, ''), 10);
          prices.push({ name, r1: isNaN(r1) || r1 < 1000 ? null : r1, r2: isNaN(r2) || r2 < 1000 ? null : r2 });
        }
        if (prices.length > 0) break;
      }

      // Ngày cập nhật: ưu tiên context "Lịch sử thay đổi" hoặc "Giá điều chỉnh".
      const text = document.body.innerText || '';
      const ctxMatch = text.match(/Lịch sử thay đổi giá xăng dầu[\s\S]{0,220}?Ngày\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
        || text.match(/Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (ctxMatch) priceDateRaw = ctxMatch[1];

      const dateCandidates = Array.from(text.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map((m) => m[1]);

      return { prices, priceDateRaw, dateCandidates };
    });

    await browser.close();

    if (rawPrices.length === 0) {
      throw new Error('Không tìm thấy dữ liệu giá từ GiaXangHomNay. Cấu trúc DOM có thể đã thay đổi.');
    }

    const prices = deduplicate(rawPrices.map((p) => ({
      name: p.name,
      region1: p.r1,
      region2: p.r2,
      price: null,
      unit: 'VND/lít',
    })));

    const strictDate = toISODate(priceDateRaw);
    const fallbackDate = pickMostLikelyPriceDate(dateCandidates, { maxAgeDays: 45, minYear: 2020 });
    const priceDate = strictDate || fallbackDate;
    logger.info(`[Scraper:GiaXangHomNay] Cào được ${prices.length} sản phẩm. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return { prices, scrapedAt: new Date().toISOString(), source: config.scraper.giaxanghomnayUrl, priceDate };
  } catch (err) {
    await browser.close().catch(() => {});
    logger.error(`[Scraper:GiaXangHomNay] Lỗi: ${err.message}`);
    throw err;
  }
}


/* ==========================================================================
 * [SCRAPER] - TRA CỨU TỈNH THÀNH CHỈ ĐỊNH
 * ========================================================================== */

/**
 * Thu thập kết quả theo chuyên trang tỉnh của GiaXangHomNay.
 * Ví dụ: Lấy giá chi tiết áp dụng cho đúng Vùng của "ha-noi".
 *
 * @param {string} slug - Tên viết không dấu của Tỉnh cần tra cứu (VD: "ha-noi").
 * @returns {Promise<ScraperResult & {provinceName: string, region: string}>} - Có kèm tên tỉnh gốc và phân vùng.
 */
async function scrapeProvincePrice(slug) {
  const url = `${config.scraper.giaxanghomnayUrl}/tinh-tp/${slug}`;
  logger.info(`[Scraper:Province] Cào tỉnh: ${slug}`);
  const start = Date.now();
  const { browser, context } = await createBrowser();

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    await page.waitForTimeout(1500);

    const { rawPrices, priceDateRaw, provinceName, region } = await page.evaluate(() => {
      // Tiêu đề tỉnh
      const h1 = document.querySelector('h1');
      const provinceName = h1 ? h1.textContent.replace(/giá xăng dầu/i, '').replace(/hôm nay/i, '').trim() : 'Unknown';

      // Xác định vùng 1 hay 2
      const bodyText = document.body.innerText || '';
      const region = /vùng 2/i.test(bodyText) ? '2' : '1';

      // Ngày
      const dateEl = document.querySelector('input[type="date"]');
      const priceDateRaw = dateEl?.value || (bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] || null);

      // Bảng giá
      const rawPrices = [];
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr, tr');
        for (const row of rows) {
          const cells = [...row.querySelectorAll('td')];
          if (cells.length < 2) continue;
          const name = cells[0].textContent.trim();
          if (!/xăng|dầu|ron|do\b|diesel|hỏa/i.test(name)) continue;
          // GiaXangHomNay tỉnh thành: Tên | Tăng giảm | Tăng giảm kỳ trước | Giá
          const priceRaw = cells[cells.length - 1].textContent.trim();
          const price = parseInt(priceRaw.replace(/[.,\s]/g, ''), 10);
          if (!isNaN(price) && price > 1000) rawPrices.push({ name, price });
        }
        if (rawPrices.length > 0) break;
      }

      return { rawPrices, priceDateRaw, provinceName, region };
    });

    await browser.close();

    // Chuẩn hoá ngày từ input[type=date] — đã là YYYY-MM-DD
    let priceDate = null;
    if (priceDateRaw) {
      priceDate = /^\d{4}-\d{2}-\d{2}/.test(priceDateRaw) ? priceDateRaw.slice(0, 10) : toISODate(priceDateRaw);
    }

    const prices = deduplicate(rawPrices.map((p) => ({
      name: p.name,
      region1: region === '1' ? p.price : null,
      region2: region === '2' ? p.price : null,
      price: null,
      unit: 'VND/lít',
    })));

    logger.info(`[Scraper:Province] ${slug}: ${prices.length} sản phẩm, Vùng ${region} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return { prices, scrapedAt: new Date().toISOString(), source: url, priceDate, provinceName, region };
  } catch (err) {
    await browser.close().catch(() => {});
    logger.error(`[Scraper:Province:${slug}] Lỗi: ${err.message}`);
    throw err;
  }
}


module.exports = { scrapeGiaxanghomnay, scrapeProvincePrice };

