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
 * [SCRAPER] - PVOIL
 * Chiến lược 4 tầng (tối ưu RAM + độ ổn định):
 *   0. [PRIMARY] Bypass Cloudflare qua IP gốc + header Host — không cần browser.
 *      Kỹ thuật tham khảo từ bài blog "Xây dựng Vietfuel API phiên bản ít RAM"
 *      của tác giả toidicakhia (https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram).
 *   1. Cào trực tiếp pvoil.com.vn với kỹ thuật stealth hợp pháp.
 *   2. Fallback văn bản qua giaxanghomnay.com (trung gian tổng hợp công khai).
 *   3. Fallback HTTP fetch nhẹ qua một trang tổng hợp khác (petrotimes rss).
 * Dự án phi lợi nhuận/cộng đồng — không xâm phạm hệ thống gốc, chỉ đọc
 * dữ liệu công khai như người dùng bình thường.
 * ========================================================================== */

const https = require('https');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const {
  pickRandomUA,
  humanDelay,
  BOT_UA,
  parsePrice,
  deduplicate,
  toISODate,
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

async function scrapeFromOriginIP() {
  /**
   * Tầng 0: Bypass Cloudflare bằng cách truy cập thẳng IP origin của PVOil.
   * Bảng HTML có 4 cột: STT | Tên sản phẩm | Giá | Biến động
   * PVOil chỉ có 1 vùng giá duy nhất (không phân Vùng 1/2).
   *
   * Credit: toidicakhia (https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram)
   */
  const PVOIL_ORIGIN_IP = '103.21.120.100';
  const PVOIL_API_PATH = '/api/oilprice/load-view';
  const targetUrl = `https://${PVOIL_ORIGIN_IP}${PVOIL_API_PATH}`;

  // Bỏ qua kiểm tra SSL certificate vì dùng IP trực tiếp thay vì domain
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      agent: httpsAgent,
      headers: {
        'Host': 'www.pvoil.com.vn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    /**
     * Cấu trúc bảng: <tbody><tr><td>STT</td><td>Tên</td><td>Giá</td><td>Biến động</td></tr>...
     * Cột 0 = số thứ tự, cột 1 = tên, cột 2 = giá, cột 3 = biến động
     */
    const results = [];
    $('tbody tr').each((_, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 3) {
        const name = cols.eq(1).text().trim();
        const priceRaw = cols.eq(2).text().trim(); // e.g. "24.350 đ" or "24,350"
        const parsed = parsePrice(priceRaw);
        if (name && parsed && /xăng|dầu|ron|do|e5|e10|mazut/i.test(name)) {
          results.push({
            name,
            region1: null,
            region2: null,
            price: parsed,
            unit: 'VND/lít',
          });
        }
      }
    });

    if (!results.length) throw new Error('Không parse được bảng giá từ IP origin');

    const prices = deduplicate(results);
    const fullText = $.root().text();
    return {
      prices,
      scrapedAt: new Date().toISOString(),
      source: 'https://www.pvoil.com.vn',
      priceDate: extractDateFromText(fullText),
      priceDateSource: 'pvoil-origin-ip',
      priceAnnouncedAt: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tầng 1: HTTP fetch trực tiếp pvoil.com.vn (không cần Playwright).
 * Dùng header giả lập browser thật để bypass kiểm tra cơ bản.
 */
async function scrapeFromPvoilDirect() {
  const r = await fetch(config.scraper.pvoilUrl, {
    headers: {
      'User-Agent': pickRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'Referer': 'https://www.google.com/',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} từ PVOil direct`);
  const html = await r.text();

  // Kiểm tra Cloudflare block
  const $ = cheerio.load(html);
  const bodyText = $.root().text();
  if (isAntiBotPage(bodyText, $('title').text())) {
    throw new Error('Trang PVOil bị Cloudflare chặn (HTTP direct).');
  }

  const prices = extractPvoilPricesFromText(bodyText);
  if (!prices.length) throw new Error('Không parse được giá từ PVOil direct HTTP.');

  return {
    prices,
    scrapedAt: new Date().toISOString(),
    source: config.scraper.pvoilUrl,
    priceDate: extractDateFromText(bodyText),
    priceDateSource: 'pvoil-direct-http',
    priceAnnouncedAt: null,
  };
}

async function scrapeFromFallbackText() {
  /**
   * Tầng 2: Fallback GXHN — parse bảng HTML trực tiếp thay vì dùng text thô.
   * GXHN render bảng giá PVOil riêng biệt, cần parse qua cheerio để lấy đủ sản phẩm.
   */
  const r = await fetch('https://giaxanghomnay.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9',
    },
  });
  if (!r.ok) throw new Error(`GXHN fallback HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);

  // Tìm section PVOil: tìm heading/text chứa "pvoil" rồi lấy bảng kế tiếp
  const results = [];

  // Cách 1: Parse các bảng trong trang, tìm section PVOil theo heading
  let foundPvoilSection = false;
  $('section, div').each((_, el) => {
    const sectionText = $(el).text().toLowerCase();
    if (!foundPvoilSection && sectionText.includes('pvoil')) {
      // Parse các dòng có giá trong section này
      $(el).find('tr').each((_, row) => {
        const cols = $(row).find('td,th');
        if (cols.length >= 2) {
          const name = cols.eq(0).text().trim();
          const priceRaw = cols.last().text().trim();
          const parsed = parsePrice(priceRaw);
          if (name && parsed && /xăng|dầu|ron|do|e5|e10|mazut/i.test(name)) {
            results.push({ name, region1: null, region2: null, price: parsed, unit: 'VND/lít' });
          }
        }
      });
      if (results.length > 0) foundPvoilSection = true;
    }
  });

  // Cách 2: Nếu không tìm được bảng, dùng text extract (fallback cũ)
  if (!results.length) {
    const bodyText = $.root().text();
    const section = findPvoilSection(bodyText);
    const textPrices = extractPvoilPricesFromText(section);
    if (textPrices.length) results.push(...textPrices);
    if (!results.length) {
      const allTextPrices = extractPvoilPricesFromText(bodyText);
      results.push(...allTextPrices);
    }
  }

  if (!results.length) throw new Error('Fallback GXHN không trích xuất được dữ liệu PVOIL.');

  const bodyText = $.root().text();
  return {
    prices: deduplicate(results),
    scrapedAt: new Date().toISOString(),
    source: 'https://giaxanghomnay.com/',
    priceDate: extractDateFromText(bodyText),
    priceDateSource: 'pvoil-gxhn',
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
  logger.info('[Scraper:PVOil] Bắt đầu cào dữ liệu (chiến lược 4 tầng)...');
  const start = Date.now();

  // Tầng 0: Bypass Cloudflare qua IP gốc (nhẹ, không cần browser)
  try {
    const result = await scrapeFromOriginIP();
    logger.info('[Scraper:PVOil] [Tầng 0] Thành công từ IP origin (bypass Cloudflare).');
    result._tier = 0;
    logger.info(`[Scraper:PVOil] Cào được ${result.prices.length} sản phẩm. priceDate=${result.priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
    return result;
  } catch (originErr) {
    logger.warn(`[Scraper:PVOil] [Tầng 0] Thất bại: ${originErr.message}`);
  }

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

