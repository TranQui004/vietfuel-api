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
 * [SCRAPER] - PVOIL
 * Chiến lược 3 tầng (ba lớp dự phòng):
 *   1. Cào trực tiếp pvoil.com.vn với kỹ thuật stealth hợp pháp.
 *   2. Fallback văn bản qua giaxanghomnay.com (trung gian tổng hợp công khai).
 *   3. Fallback HTTP fetch nhẹ qua một trang tổng hợp khác (petrotimes rss).
 * Dự án phi lợi nhuận/cộng đồng — không xâm phạm hệ thống gốc, chỉ đọc
 * dữ liệu công khai như người dùng bình thường.
 * ========================================================================== */

const https = require('https');
const {
  fetchGXHNPage,
  createBrowser,
  pickRandomUA,
  humanDelay,
  BOT_UA,
} = require('./utils');
const {
  isAntiBotPage,
  extractDateFromText,
  findPvoilSection,
  extractPvoilPricesFromText,
} = require('./pvoil-parser');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Lấy văn bản một URL công khai qua HTTPS thuần (không headless).
 * Dùng BOT_UA rõ ràng  quản trị viên nguồn có thể nhận diện và liên hệ nếu cần.
 */
function fetchPublicText(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': BOT_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Bot-Info': 'VietFuelBot non-profit; github.com/TranQui004/vietfuel-api',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('HTTP fetch timeout')); });
    req.on('error', reject);
  });
}

async function scrapeFromPvoilDirect() {
  // Tạo browser mới với BOT_UA mặc định (từ createBrowser)
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();

    await page.goto(config.scraper.pvoilUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.scraper.timeout,
    });

    // Chờ nhân đạo giả lập người dùng thực (800ms–2.5s)
    await humanDelay(800, 2500);

    const payload = await page.evaluate(() => ({
      title: document.title || '',
      bodyText: document.body?.innerText || '',
    }));

    // Nếu bị Cloudflare chặn BOT_UA → thử lại với stealth UA
    if (isAntiBotPage(payload.bodyText, payload.title)) {
      logger.warn('[Scraper:PVOil] BOT_UA bị chặn, thử lại với stealth UA...');
      await page.setExtraHTTPHeaders({ 'User-Agent': pickRandomUA() });
      await page.reload({ waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
      await humanDelay(1000, 3000);
      await page.mouse.move(400, 300);
      await humanDelay(300, 700);
      await page.mouse.wheel(0, 400);
      await humanDelay(400, 900);

      const retryPayload = await page.evaluate(() => ({
        title: document.title || '',
        bodyText: document.body?.innerText || '',
      }));

      if (isAntiBotPage(retryPayload.bodyText, retryPayload.title)) {
        throw new Error('Trang PVOIL bị chặn bởi lớp bảo vệ anti-bot (Cloudflare) ngay cả với stealth UA.');
      }

      Object.assign(payload, retryPayload);
    }

    const prices = extractPvoilPricesFromText(payload.bodyText);
    if (prices.length === 0) {
      throw new Error('Không trích xuất được bảng giá từ trang PVOIL trực tiếp.');
    }

    return {
      prices,
      scrapedAt: new Date().toISOString(),
      source: config.scraper.pvoilUrl,
      priceDate: extractDateFromText(payload.bodyText),
      priceDateSource: 'pvoil-text',
      priceAnnouncedAt: null,
    };
  } finally {
    await browser.close();
  }
}

async function scrapeFromFallbackText() {
  const { bodyText } = await fetchGXHNPage('https://giaxanghomnay.com/');
  const section = findPvoilSection(bodyText);

  let prices = extractPvoilPricesFromText(section);
  if (!prices.length) {
    prices = extractPvoilPricesFromText(bodyText);
  }
  if (!prices.length) {
    throw new Error('Fallback không trích xuất được dữ liệu PVOIL từ nguồn trung gian.');
  }

  return {
    prices,
    scrapedAt: new Date().toISOString(),
    source: 'https://giaxanghomnay.com/',
    priceDate: extractDateFromText(section) || extractDateFromText(bodyText),
    priceDateSource: 'pvoil-text',
    priceAnnouncedAt: null,
  };
}

/**
 * Tầng 3: Gọi HTTP thuần (không Playwright) tới trang tổng hợp thứ hai.
 * Phù hợp với các trang render HTML tĩnh, không cần JavaScript.
 * Hoàn toàn hợp pháp — đọc dữ liệu công khai theo cách bình thường.
 */
async function scrapeFromLightFetch() {
  // Thử vài nguồn tổng hợp công khai khác nhau
  const FALLBACK_URLS = [
    'https://petrotimes.vn/gia-xang-dau.html',
    'https://giaxang.vn/',
  ];

  for (const url of FALLBACK_URLS) {
    try {
      const html = await fetchPublicText(url);
      // Lấy phần text từ HTML đơn giản (bỏ tags)
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const section = findPvoilSection(text);
      const prices = extractPvoilPricesFromText(section) || extractPvoilPricesFromText(text);

      if (prices.length > 0) {
        return {
          prices,
          scrapedAt: new Date().toISOString(),
          source: url,
          priceDate: extractDateFromText(section) || extractDateFromText(text),
          priceDateSource: 'pvoil-text-light',
          priceAnnouncedAt: null,
        };
      }
    } catch (e) {
      logger.warn(`[Scraper:PVOil] Light-fetch ${url} lỗi: ${e.message}`);
    }
  }

  throw new Error('Tất cả 3 tầng cào dữ liệu PVOIL đều thất bại.');
}

/**
 * Trích xuất bảng giá PVOil theo chiến lược nhiều tầng.
 * @returns {Object} - prices, priceDate, priceDateSource, scrapedAt, source
 */
async function scrapePVOil() {
  logger.info('[Scraper:PVOil] Bắt đầu cào dữ liệu (chiến lược 3 tầng)...');
  const start = Date.now();

  let blockedByProtection = false;

  // Tầng 1: Cào trực tiếp với kỹ thuật stealth
  try {
    const result = await scrapeFromPvoilDirect();
    logger.info('[Scraper:PVOil] [Tầng 1] Thành công từ nguồn trực tiếp pvoil.com.vn.');
    result._tier = 1;
    logger.info(`[Scraper:PVOil] Cào được ${result.prices.length} sản phẩm. priceDate=${result.priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return result;
  } catch (directErr) {
    logger.warn(`[Scraper:PVOil] [Tầng 1] Thất bại: ${directErr.message}`);
    blockedByProtection = /anti-bot|cloudflare|security verification|just a moment/i.test(String(directErr.message));
  }

  // Tầng 2: Fallback tổng hợp qua giaxanghomnay.com
  try {
    const result = await scrapeFromFallbackText();
    logger.info('[Scraper:PVOil] [Tầng 2] Thành công từ giaxanghomnay.com.');
    result._tier = 2;
    if (blockedByProtection) result.blockedByProtection = true;
    logger.info(`[Scraper:PVOil] Cào được ${result.prices.length} sản phẩm. priceDate=${result.priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return result;
  } catch (fallbackErr) {
    logger.warn(`[Scraper:PVOil] [Tầng 2] Thất bại: ${fallbackErr.message}`);
  }

  // Tầng 3: HTTP fetch nhẹ không cần Playwright
  try {
    const result = await scrapeFromLightFetch();
    logger.info(`[Scraper:PVOil] [Tầng 3] Thành công từ nguồn dự phòng: ${result.source}.`);
    result._tier = 3;
    result.blockedByProtection = true;
    logger.info(`[Scraper:PVOil] Cào được ${result.prices.length} sản phẩm. priceDate=${result.priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return result;
  } catch (lightErr) {
    logger.error(`[Scraper:PVOil] [Tầng 3] Thất bại: ${lightErr.message}`);
    throw new Error('[Scraper:PVOil] Tất cả 3 tầng dự phòng đều thất bại. Hệ thống sẽ dùng Stale Cache.');
  }
}

module.exports = { scrapePVOil };

