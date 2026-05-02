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
 * [SCRAPER UTILITIES] - Các Hàm Xử Lý Bổ Trợ Chung
 *
 * Nhiệm vụ: Chứa logic cốt lõi tái sử dụng cao như việc bóc tách số tiền (parsePrice), 
 * chuẩn hoá ngày tháng (toISODate), loại bỏ dữ liệu trùng lặp (deduplicate) 
 * và khởi chạy cấu hình gốc headless trình duyệt Playwright (createBrowser).
 * ========================================================================== */

const { chromium } = require('playwright');
const config = require('../../config');
const logger = require('../../utils/logger');

// Bot User-Agent minh bạch — thông báo rõ danh tính cho quản trị viên nguồn.
// Tâu nguyên tắc thu thập dữ liệu công khai theo lề phải của cộng đồng mã nguồn mở.
const BOT_UA = 'VietFuelBot/1.0 (Community non-profit data aggregator; +https://github.com/TranQui004/vietfuel-api)';

// Pool User-Agent thực tế — chỉ dùng khi nguồn có Cloudflare/anti-bot mạnh chặn bọt rõ ràng.
// Việc luân phiên UA là giải pháp kỹ thuật cuối cùng, ưu tiên dùng BOT_UA trước.
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

/**
 * Chọn ngẫu nhiên một User-Agent stealth từ pool.
 * Chỉ dùng khi bị Cloudflare chặn và cần fallback — không phải lựa chọn đầu tiên.
 */
function pickRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Chờ ngẫu nhiên để giả lập hành vi người dùng thực tế.
 * Giảm khả năng bị bot detection dựa trên tốc độ request.
 * @param {number} minMs - Thời gian tối thiểu (ms)
 * @param {number} maxMs - Thời gian tối đa (ms)
 */
function humanDelay(minMs = 800, maxMs = 2500) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Chuyển đổi định dạng chuỗi số tiền tệ thành kiểu số nguyên (Integer).
 * Loại bỏ dấu phẩy, dấu chấm hoặc khoảng trắng (VD: "24.730" đóng thành 24730).
 */
function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[.\s]/g, '').replace(',', '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num < 1000 ? null : num;
}

/**
 * Lọc bỏ các phần tử trùng lặp trong bộ Data dựa theo tên nhiên liệu.
 * Giữ lại dòng dữ liệu xuất hiện đầu tiên.
 */
function deduplicate(prices) {
  const seen = new Set();
  return prices.filter((p) => {
    const key = p.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Biến đổi các định dạng ngày truyền thống (DD/MM/YYYY) thành chuẩn ISO 8601 YYYY-MM-DD.
 */
function toISODate(raw) {
  if (!raw) return null;
  // Đã ở dạng ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // DD/MM/YYYY hoặc D/M/YYYY
  const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Chọn ngày có khả năng là ngày niêm yết từ danh sách ứng viên,
 * loại bỏ các mốc lịch sử/không hợp lý để tránh dính ngày cũ trên trang.
 */
function pickMostLikelyPriceDate(candidates, options = {}) {
  const maxAgeDays = options.maxAgeDays ?? 45;
  const minYear = options.minYear ?? 2020;
  if (!Array.isArray(candidates) || !candidates.length) return null;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const valid = [];
  for (const raw of candidates) {
    const iso = toISODate(raw);
    if (!iso) continue;

    const ts = Date.parse(`${iso}T00:00:00.000Z`);
    if (Number.isNaN(ts)) continue;

    const year = Number(iso.slice(0, 4));
    if (year < minYear) continue;

    if (ts > now) continue;
    if ((now - ts) / dayMs > maxAgeDays) continue;

    valid.push({ iso, ts });
  }

  if (!valid.length) return null;

  valid.sort((a, b) => b.ts - a.ts);
  return valid[0].iso;
 }

/**
 * Tạo một Instance Context của Playwright Browser để bắt đầu trích xuất.
 * Tái sử dụng ngữ cảnh cấu hình giúp tối ưu CPU/RAM tránh tải tài nguyên thừa.
 */
async function createBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    // Sử dụng Bot UA rõ ràng theo mặc định — minh bạch cho quản trị viên nguồn.
    // Chỉ các scraper có Cloudflare mới cần ghi đè bằng pickRandomUA() sau đó.
    userAgent: BOT_UA,
    locale: 'vi-VN',
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'X-Bot-Info': 'VietFuelBot non-profit; github.com/TranQui004/vietfuel-api',
    },
  });
  // Chặn resource không cần thiết để tiết kiệm RAM và tăng tốc
  await context.route(
    '**/*.{png,jpg,jpeg,gif,webp,woff,woff2,ttf,eot,mp4,mp3,ico}',
    (route) => route.abort()
  );
  return { browser, context };
}

/**
 * Tải và trích xuất nội dung từ trang giaxanghomnay.com (SSR nhẹ).
 * Chạy riêng biệt vì trang này có logic cào DOM riêng (tables và bodyText).
 */
async function fetchGXHNPage(url) {
  const { browser, context } = await createBrowser();
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.scraper.timeout });
    await page.waitForTimeout(1500);
    const tables = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table')).map((t) => t.innerText)
    );
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    return { tables, bodyText };
  } finally {
    await browser.close();
  }
}

/**
 * Phân tích (Parse) chuỗi văn bản bảng giá được lấy từ giaxanghomnay.com
 */
function parseGXHNTable(tableText, hasRegions = false) {
  const lines = tableText.split('\n').map((l) => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    const parts = line.split(/\t/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const name = parts[0];
    if (!/xăng|dầu|ron|do\b|diesel|hỏa|ko/i.test(name)) continue;

    if (hasRegions && parts.length >= 4) {
      const price = parsePrice(parts[parts.length - 1]);
      if (price) results.push({ name, region2: price });
    } else if (parts.length >= 4) {
      const price = parsePrice(parts[parts.length - 1]);
      if (price) results.push({ name, price });
    } else if (parts.length >= 2) {
      const price = parsePrice(parts[1]);
      if (price) results.push({ name, price });
    }
  }
  return results;
}

module.exports = {
  BOT_UA,
  parsePrice,
  deduplicate,
  toISODate,
  pickMostLikelyPriceDate,
  pickRandomUA,
  humanDelay,
  createBrowser,
  fetchGXHNPage,
  parseGXHNTable,
};

