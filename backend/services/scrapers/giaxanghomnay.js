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
 * [SCRAPER] - GIAXANGHOMNAY (HTTP-first, Playwright-free)
 * Nguồn dữ liệu lớn nhất — dùng cho fallback và tra cứu tỉnh thành.
 *
 * Kỹ thuật: HTTP fetch + cheerio parse HTML tĩnh (SSR).
 * GiaXangHomNay render đầy đủ table ngay trong HTML — không cần JS.
 * ========================================================================== */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { parsePrice, deduplicate, toISODate, pickMostLikelyPriceDate, BOT_UA } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

const GXHN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  'X-Bot-Info': 'VietFuelBot non-profit; github.com/TranQui004/vietfuel-api',
};

/**
 * Trích xuất bảng giá Petrolimex (Vùng 1 & 2) từ GiaXangHomNay.
 * Trang render SSR → parse HTML tĩnh với cheerio, không cần trình duyệt.
 *
 * @returns {Promise<ScraperResult>}
 */
async function scrapeGiaxanghomnay() {
  logger.info('[Scraper:GiaXangHomNay] Bắt đầu cào dữ liệu trang chủ (HTTP)...');
  const start = Date.now();

  const r = await fetch(config.scraper.giaxanghomnayUrl, { headers: GXHN_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} từ GiaXangHomNay`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const rawPrices = [];
  let priceDateRaw = null;
  const dateCandidates = [];

  // Bảng Petrolimex là bảng đầu tiên có header "Vùng 1" hoặc "Vùng 2"
  $('table').each((_, table) => {
    if (rawPrices.length > 0) return; // đã tìm được, dừng
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
      rawPrices.push({
        name,
        r1: isNaN(r1) || r1 < 1000 ? null : r1,
        r2: isNaN(r2) || r2 < 1000 ? null : r2,
      });
    });
  });

  // Trích xuất ngày từ body text
  const bodyText = $('body').text();
  const ctxMatch = bodyText.match(/Lịch sử thay đổi giá xăng dầu[\s\S]{0,220}?Ngày\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    || bodyText.match(/Giá\s*điều\s*chỉnh\s*từ[^\n]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (ctxMatch) priceDateRaw = ctxMatch[1];

  const allDates = [...bodyText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)].map(m => m[1]);
  dateCandidates.push(...allDates);

  if (rawPrices.length === 0) {
    throw new Error('Không tìm thấy dữ liệu giá từ GiaXangHomNay. Cấu trúc HTML có thể đã thay đổi.');
  }

  const prices = deduplicate(rawPrices.map(p => ({
    name: p.name,
    region1: p.r1,
    region2: p.r2,
    price: null,
    unit: 'VND/lít',
  })));

  const strictDate = toISODate(priceDateRaw);
  const fallbackDate = pickMostLikelyPriceDate(dateCandidates, { maxAgeDays: 45, minYear: 2020 });
  const priceDate = strictDate || fallbackDate;

  logger.info(`[Scraper:GiaXangHomNay] ✅ Cào được ${prices.length} sản phẩm. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return { prices, scrapedAt: new Date().toISOString(), source: config.scraper.giaxanghomnayUrl, priceDate };
}


/* ==========================================================================
 * [SCRAPER] - TRA CỨU TỈNH THÀNH — HTTP-first
 * ========================================================================== */

/**
 * Thu thập giá theo tỉnh thành từ GiaXangHomNay.
 * SSR đầy đủ → parse cheerio thuần.
 *
 * @param {string} slug - VD: "ha-noi"
 * @returns {Promise<ScraperResult & {provinceName: string, region: string}>}
 */
async function scrapeProvincePrice(slug) {
  const url = `${config.scraper.giaxanghomnayUrl}/tinh-tp/${slug}`;
  logger.info(`[Scraper:Province] Cào tỉnh (HTTP): ${slug}`);
  const start = Date.now();

  const r = await fetch(url, { headers: GXHN_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} khi cào tỉnh ${slug}`);
  const html = await r.text();
  const $ = cheerio.load(html);

  // Tên tỉnh
  const provinceName = $('h1').first().text().replace(/giá xăng dầu/i, '').replace(/hôm nay/i, '').trim() || 'Unknown';

  // Vùng
  const bodyText = $('body').text();
  const region = /vùng 2/i.test(bodyText) ? '2' : '1';

  // Ngày: ưu tiên input[type=date], fallback regex
  const dateInput = $('input[type="date"]').val();
  let priceDateRaw = dateInput || (bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] || null);

  // Bảng giá
  const rawPrices = [];
  $('table').each((_, table) => {
    if (rawPrices.length > 0) return;
    $(table).find('tbody tr, tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const name = $(cells[0]).text().trim();
      if (!/xăng|dầu|ron|do\b|diesel|hỏa/i.test(name)) return;
      const priceRaw = $(cells[cells.length - 1]).text().trim();
      const price = parseInt(priceRaw.replace(/[.,\s]/g, ''), 10);
      if (!isNaN(price) && price > 1000) rawPrices.push({ name, price });
    });
  });

  // Chuẩn hoá ngày
  let priceDate = null;
  if (priceDateRaw) {
    priceDate = /^\d{4}-\d{2}-\d{2}/.test(priceDateRaw) ? priceDateRaw.slice(0, 10) : toISODate(priceDateRaw);
  }

  const prices = deduplicate(rawPrices.map(p => ({
    name: p.name,
    region1: region === '1' ? p.price : null,
    region2: region === '2' ? p.price : null,
    price: null,
    unit: 'VND/lít',
  })));

  logger.info(`[Scraper:Province] ${slug}: ${prices.length} sản phẩm, Vùng ${region} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return { prices, scrapedAt: new Date().toISOString(), source: url, priceDate, provinceName, region };
}


module.exports = { scrapeGiaxanghomnay, scrapeProvincePrice };
