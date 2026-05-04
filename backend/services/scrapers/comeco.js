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
 * [SCRAPER] - COMECO
 * Chiến lược 2 tầng (tối ưu RAM):
 *   1. [PRIMARY] HTTP fetch nhẹ + cheerio parse HTML — không cần browser.
 *      Kỹ thuật tham khảo từ bài blog "Xây dựng Vietfuel API phiên bản ít RAM"
 *      của tác giả toidicakhia (https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram).
 *   2. [FALLBACK] Playwright headless nếu HTTP bị chặn hoặc HTML thay đổi.
 * ========================================================================== */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { parsePrice, deduplicate, toISODate, pickMostLikelyPriceDate, createBrowser } = require('./utils');
const config = require('../../config');
const logger = require('../../utils/logger');

const COMECO_URL = config.scraper.comecoUrl || 'https://comeco.vn';
const FETCH_TIMEOUT_MS = 18000;

/**
 * Tầng 1: HTTP fetch thuần + cheerio — tiêu thụ ~0MB RAM browser.
 */
async function scrapeViaHttp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(COMECO_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VietFuelBot/1.0 (non-profit; github.com/TranQui004/vietfuel-api)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results = [];
    // Tìm section "Giá bán lẻ xăng dầu"
    const heading = $('span.section-title-main').filter((_, el) =>
      $(el).text().includes('Giá bán lẻ xăng dầu')
    ).first();

    if (heading.length) {
      const section = heading.closest('.col-inner');
      section.find('.col-inner').each((_, col) => {
        const name = $(col).find('h5').text().trim();
        const priceText = $(col).find('h2 span').text().trim().replace(/\./g, '');
        if (name && priceText && /\d{4,}/.test(priceText)) {
          results.push({ name, rawPrice: priceText });
        }
      });
    }

    // Fallback: đọc từ body text theo cấu trúc cũ nếu cheerio không tìm được
    if (!results.length) {
      const bodyText = $.root().text();
      const textBlocks = bodyText.split(/\n/);
      let currentName = '';
      for (let i = 0; i < textBlocks.length; i++) {
        const line = textBlocks[i].trim();
        if (line === 'Xăng' || line === 'Dầu') {
          currentName = line + ' ' + (textBlocks[i + 1] ? textBlocks[i + 1].trim() : '');
          i++;
        } else if (currentName && /^[\d.,]{5,}$/.test(line)) {
          results.push({ name: currentName, rawPrice: line });
          currentName = '';
        } else {
          currentName = '';
        }
      }
    }

    // Lấy ngày giá
    const fullText = $.root().text();
    const ctxMatch = fullText.match(/Gi[aá]\s*b[aá]n\s*lẻ\s*xăng\s*d[aầ]u[\s\S]{0,300}?Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i)
      || fullText.match(/Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const priceDateRaw = ctxMatch ? ctxMatch[1] : null;
    const dateCandidates = Array.from(fullText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map(m => m[1]);

    return { results, priceDateRaw, dateCandidates };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tầng 2: Fallback Playwright (giữ nguyên logic cũ).
 */
async function scrapeViaBrowser() {
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();
    await page.goto(COMECO_URL, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    const { prices, priceDateRaw, dateCandidates } = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText || '';
      const textBlocks = bodyText.split(/\n/);
      let currentName = '';
      for (let i = 0; i < textBlocks.length; i++) {
        const line = textBlocks[i].trim();
        if (line === 'Xăng' || line === 'Dầu') {
          currentName = line + ' ' + (textBlocks[i + 1] ? textBlocks[i + 1].trim() : '');
          i++;
        } else if (currentName && /^[\d.,]{5,}$/.test(line)) {
          results.push({ name: currentName, rawPrice: line });
          currentName = '';
        } else {
          currentName = '';
        }
      }
      const ctxMatch = bodyText.match(/Gi[aá]\s*b[aá]n\s*lẻ\s*xăng\s*d[aầ]u[\s\S]{0,300}?Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i)
        || bodyText.match(/Gi[aá]\s*điều\s*chỉnh\s*từ[^\n]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
      const priceDateRaw = ctxMatch ? ctxMatch[1] : null;
      const dateCandidates = Array.from(bodyText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map(m => m[1]);
      return { prices: results, priceDateRaw, dateCandidates };
    });
    return { results: prices, priceDateRaw, dateCandidates };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function scrapeComeco() {
  const start = Date.now();
  let raw;
  try {
    logger.info('[Scraper:Comeco] Thử HTTP fetch nhẹ (không cần browser)...');
    raw = await scrapeViaHttp();
    logger.info('[Scraper:Comeco] HTTP fetch thành công.');
  } catch (httpErr) {
    logger.warn(`[Scraper:Comeco] HTTP thất bại (${httpErr.message}), chuyển sang Playwright...`);
    raw = await scrapeViaBrowser();
  }

  const stdPrices = deduplicate(raw.results.map(p => ({
    name: p.name,
    region1: null,
    region2: null,
    price: parsePrice(p.rawPrice),
    unit: 'VND/lít',
  })));

  if (!stdPrices.length) throw new Error('Empty comeco prices');

  const strictPriceDate = toISODate(raw.priceDateRaw);
  const fallbackPriceDate = pickMostLikelyPriceDate(raw.dateCandidates, { maxAgeDays: 45, minYear: 2020 });
  const priceDate = strictPriceDate || fallbackPriceDate;

  logger.info(`[Scraper:Comeco] Xong. ${stdPrices.length} items. priceDate=${priceDate || 'null'} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return { prices: stdPrices, scrapedAt: new Date().toISOString(), source: COMECO_URL, priceDate };
}

module.exports = { scrapeComeco };
