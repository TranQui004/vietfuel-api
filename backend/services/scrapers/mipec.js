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
 * [SCRAPER] - MIPEC (HTTP-first, Playwright-free)
 * Công ty Cổ phần Hóa dầu Quân đội.
 *
 * Kỹ thuật:
 *   - Giá: HTTP fetch /pages/gia-xang-dau-ban-le → cheerio parse table
 *   - Ngày: HTTP fetch /blogs/tin-tuc → regex title bài viết điều chỉnh giá
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
 * Thu thập dữ liệu giá từ Mipec qua HTTP + cheerio.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapeMipec() {
  logger.info('[Scraper:Mipec] Bắt đầu cào dữ liệu (HTTP)...');
  const start = Date.now();

  // --- Bước 1: Lấy bảng giá ---
  const priceRes = await fetch(config.scraper.mipecUrl, { headers: HEADERS });
  if (!priceRes.ok) throw new Error(`HTTP ${priceRes.status} từ Mipec`);
  const priceHtml = await priceRes.text();
  const $p = cheerio.load(priceHtml);

  const result = [];
  $p('table tr').slice(1).each((_, row) => {
    const cells = $p(row).find('td');
    if (cells.length < 3) return;
    const name = $p(cells[0]).text().trim();
    const r1 = $p(cells[1]).text().trim();
    const r2 = $p(cells[2]).text().trim();
    if (name && /\d/.test(r1)) result.push({ name, r1, r2 });
  });

  // --- Bước 2: Lấy ngày từ trang tin tức ---
  let priceDateRaw = null;
  let priceDateSource = null;
  try {
    const newsRes = await fetch('https://www.mipec.com.vn/blogs/tin-tuc', { headers: HEADERS });
    if (newsRes.ok) {
      const newsHtml = await newsRes.text();
      const $n = cheerio.load(newsHtml);
      const bodyText = $n('body').text();
      // Lấy ngày từ tiêu đề bài điều chỉnh giá mới nhất
      const m = bodyText.match(/ĐIỀU CHỈNH GIÁ XĂNG DẦU[^0-9]*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (m) {
        priceDateRaw = m[1];
        priceDateSource = 'mipec-news';
      }
    }
  } catch(e) {
    logger.debug(`[Scraper:Mipec] Không lấy được ngày từ tin tức: ${e.message}`);
  }

  // Fallback: lấy ngày từ GiaXangHomNay nếu Mipec không có
  if (!priceDateRaw) {
    try {
      const gxhnRes = await fetch('https://giaxanghomnay.com/', { headers: HEADERS });
      if (gxhnRes.ok) {
        const gxhnHtml = await gxhnRes.text();
        const $g = cheerio.load(gxhnHtml);
        const gxhnText = $g('body').text();
        const m = gxhnText.match(/Giá[^0-9]{0,40}xăng[^0-9]{0,40}(\d{1,2}\/\d{1,2}\/\d{4})/i)
          || gxhnText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (m) {
          priceDateRaw = m[1];
          priceDateSource = 'gxhn-fallback';
        }
      }
    } catch(e) {
      logger.debug(`[Scraper:Mipec] Fallback GXHN ngày thất bại: ${e.message}`);
    }
  }

  const prices = deduplicate(result.map(p => ({
    name: p.name,
    region1: parsePrice(p.r1),
    region2: parsePrice(p.r2),
    price: null,
    unit: 'VND/lít',
  })));

  const priceDate = toISODate(priceDateRaw);
  logger.info(`[Scraper:Mipec] ✅ Cào được ${prices.length} sản phẩm. priceDate=${priceDate}, source=${priceDateSource} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return {
    prices,
    scrapedAt: new Date().toISOString(),
    source: config.scraper.mipecUrl,
    priceDate,
    priceDateSource: priceDateSource || null,
  };
}


module.exports = { scrapeMipec };
