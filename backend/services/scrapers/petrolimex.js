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
 * [SCRAPER] - PETROLIMEX (HTTP-first, Playwright-free)
 * Bảng giá chính thức chuẩn xác và lớn nhất thị trường.
 *
 * Kỹ thuật: Đa tầng HTTP — không cần Playwright hay headless browser.
 *
 *   Tier 0: VIEApps CMS REST API (portals.petrolimex.com.vn/~apis)
 *           → JSON trực tiếp từ server Petrolimex, bao gồm ngày LastModified,
 *             Zone1Price, Zone2Price chính xác 100%.
 *           → API nội bộ CMS được phát hiện bởi @nguynkhn (gist) và
 *             phân tích bởi toidicakhia.me. Không yêu cầu authentication.
 *
 *   Tier 1: GiaXangHomNay (giaxanghomnay.com) — SSR HTML, cập nhật 15 phút/lần.
 *           Dùng khi Tier 0 không khả dụng.
 *
 *   Tier 2: WebGia (webgia.com/gia-xang-dau/petrolimex/) — Mirror độc lập.
 *           Dùng khi Tier 0+1 đều thất bại.
 *
 * Nguồn tham khảo:
 *   - https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram (Mục 6)
 *   - https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264
 * ========================================================================== */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { parsePrice, deduplicate, toISODate, pickMostLikelyPriceDate } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  'X-Bot-Info': 'VietFuelBot non-profit; github.com/TranQui004/vietfuel-api',
};

/**
 * URL API VIEApps CMS của Petrolimex.
 * x-request là base64 của JSON filter (không mã hoá, không cần JWT).
 * Phát hiện bởi @nguynkhn: https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264
 */
const PLX_API_URL = 'https://portals.petrolimex.com.vn/~apis/portals/cms.item/search?x-request=eyJGaWx0ZXJCeSI6eyJBbmQiOlt7IlN5c3RlbUlEIjp7IkVxdWFscyI6IjY3ODNkYzEyNzFmZjQ0OWU5NWI3NGE5NTIwOTY0MTY5In19LHsiUmVwb3NpdG9yeUlEIjp7IkVxdWFscyI6ImE5NTQ1MWUyM2I0NzRmZTU4ODZiZmI3Y2Y4NDNmNTNjIn19LHsiUmVwb3NpdG9yeUVudGl0eUlEIjp7IkVxdWFscyI6IjM4MDEzNzhmZTFlMDQ1YjFhZmExMGRlN2M1Nzc2MTI0In19LHsiU3RhdHVzIjp7IkVxdWFscyI6IlB1Ymxpc2hlZCJ9fV19LCJTb3J0QnkiOnsiTGFzdE1vZGlmaWVkIjoiRGVzY2VuZGluZyJ9LCJQYWdpbmF0aW9uIjp7IlRvdGFsUmVjb3JkcyI6LTEsIlRvdGFsUGFnZXMiOjAsIlBhZ2VTaXplIjowLCJQYWdlTnVtYmVyIjowfX0';

/**
 * Tier 0: Gọi trực tiếp VIEApps CMS REST API của Petrolimex.
 * Trả về JSON với Zone1Price, Zone2Price và LastModified chính xác.
 */
async function fetchFromPLXApi() {
  const r = await fetch(PLX_API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.petrolimex.com.vn/',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} từ Petrolimex API`);

  const data = await r.json();
  const objects = data.Objects || [];
  if (objects.length === 0) throw new Error('Petrolimex API trả về danh sách rỗng');

  // Sắp xếp theo DisplayOrder (trường bị typo trong API: DIsplayOrder)
  objects.sort((a, b) => (a.DIsplayOrder || a.OrderIndex || 99) - (b.DIsplayOrder || b.OrderIndex || 99));

  const rawPrices = objects.map(item => ({
    name: item.Title,
    r1: item.Zone1Price,
    r2: item.Zone2Price,
    lastModified: item.LastModified,
  })).filter(p => p.name && p.r1 > 0);

  // Lấy ngày từ LastModified của sản phẩm mới nhất
  const latestModified = objects
    .map(o => o.LastModified)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const priceDate = latestModified ? latestModified.slice(0, 10) : null;

  return { rawPrices, priceDate, sourceTier: 'plx-api' };
}

/**
 * Tier 1: Cào bảng giá Petrolimex từ GiaXangHomNay (SSR HTML).
 */
async function fetchFromGXHN() {
  const r = await fetch(config.scraper.giaxanghomnayUrl, { headers: HTTP_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} từ GiaXangHomNay`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const rawPrices = [];
  let priceDateRaw = null;
  const dateCandidates = [];

  $('table').each((_, table) => {
    if (rawPrices.length > 0) return;
    const headers = $(table).find('thead th, thead td').map((_, el) => $(el).text().toLowerCase()).get();
    const hasRegion = headers.some(h => h.includes('vùng') || h.includes('vu'));
    if (!hasRegion) return;

    $(table).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const name = $(cells[0]).text().trim();
      if (!/xăng|dầu|ron|do\b|diesel|hỏa/i.test(name)) return;
      const r1Raw = $(cells[cells.length - 2]).text().trim();
      const r2Raw = $(cells[cells.length - 1]).text().trim();
      const r1 = parseInt((r1Raw || '').replace(/[.,\s]/g, ''), 10);
      const r2 = parseInt((r2Raw || '').replace(/[.,\s]/g, ''), 10);
      rawPrices.push({ name, r1: isNaN(r1) || r1 < 1000 ? null : r1, r2: isNaN(r2) || r2 < 1000 ? null : r2 });
    });
  });

  if (rawPrices.length === 0) throw new Error('Không tìm thấy bảng giá từ GiaXangHomNay');

  const bodyText = $('body').text();
  const ctxMatch = bodyText.match(/Lịch sử thay đổi giá xăng dầu[\s\S]{0,220}?Ngày\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || bodyText.match(/Giá\s*điều\s*chỉnh\s*từ[^\n]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (ctxMatch) priceDateRaw = ctxMatch[1];
  const allDates = [...bodyText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)].map(m => m[1]);
  dateCandidates.push(...allDates);

  const strictDate = toISODate(priceDateRaw);
  const fallbackDate = pickMostLikelyPriceDate(dateCandidates, { maxAgeDays: 45, minYear: 2020 });
  return { rawPrices, priceDate: strictDate || fallbackDate, sourceTier: 'gxhn' };
}

/**
 * Tier 2: Cào bảng giá từ WebGia (SSR HTML, mirror độc lập).
 */
async function fetchFromWebGia() {
  const r = await fetch(config.scraper.webgiaUrl, { headers: HTTP_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} từ WebGia`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const rawPrices = [];
  $('table').each((_, table) => {
    if (rawPrices.length > 0) return;
    const headers = $(table).find('th').map((_, el) => $(el).text().trim()).get();
    if (!headers.some(h => /sản phẩm/i.test(h)) || !headers.some(h => /vùng 1/i.test(h))) return;
    const productNames = headers.slice(3).filter(h => /xăng|dầu|ron|do\b|hỏa/i.test(h));
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
      if (row) rawPrices.push({ name, r1: parsePrice(row.r1), r2: parsePrice(row.r2) });
    });
  });

  if (rawPrices.length === 0) throw new Error('Không tìm thấy bảng giá từ WebGia');

  const bodyText = $('body').text();
  const m = bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  const priceDate = toISODate(m ? m[1] : null);
  return { rawPrices, priceDate, sourceTier: 'webgia' };
}


/**
 * Cào bảng giá chính thức từ Petrolimex.
 * Chiến lược đa tầng HTTP-first — không cần Playwright.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapePetrolimex() {
  logger.info('[Scraper:Petrolimex] Bắt đầu cào dữ liệu (API REST → GXHN → WebGia)...');
  const start = Date.now();

  const tiers = [
    { name: 'Tier-0 PLX-API',         fn: fetchFromPLXApi },
    { name: 'Tier-1 GiaXangHomNay',    fn: fetchFromGXHN },
    { name: 'Tier-2 WebGia',           fn: fetchFromWebGia },
  ];

  let lastError;
  let tierResult = null;

  for (const tier of tiers) {
    try {
      tierResult = await tier.fn();
      logger.info(`[Scraper:Petrolimex] ${tier.name} thành công.`);
      break;
    } catch(err) {
      lastError = err;
      logger.warn(`[Scraper:Petrolimex] ${tier.name} thất bại: ${err.message}. Chuyển tier tiếp theo...`);
    }
  }

  if (!tierResult) {
    logger.error(`[Scraper:Petrolimex] Tất cả tier thất bại. Lỗi cuối: ${lastError.message}`);
    throw lastError;
  }

  const { rawPrices, priceDate, sourceTier } = tierResult;

  const prices = deduplicate(
    rawPrices
      .map(p => ({
        name: p.name,
        // Tier 0 trả về số nguyên, Tier 1+2 trả về số hoặc string
        region1: typeof p.r1 === 'number' ? p.r1 : parsePrice(String(p.r1)),
        region2: typeof p.r2 === 'number' ? p.r2 : parsePrice(String(p.r2)),
        price: null,
        unit: 'VND/lít',
      }))
      .filter(p => p.region1 !== null && p.region1 >= 1000)
  );

  logger.info(`[Scraper:Petrolimex] ✅ Cào được ${prices.length} sản phẩm qua ${sourceTier}. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return {
    prices,
    scrapedAt: new Date().toISOString(),
    source: config.scraper.petrolimexUrl,
    priceDate,
    _sourceTier: sourceTier,
  };
}


module.exports = { scrapePetrolimex };
