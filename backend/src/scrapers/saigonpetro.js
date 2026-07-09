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
 * [SCRAPER] - SAIGON PETRO
 * Chiến lược 2 tầng (tối ưu RAM):
 *   1. [PRIMARY] HTTP fetch trang chính → trích xuất param "data-list" từ
 *      select#time → gọi API động load-time → parse cheerio.
 *      Kỹ thuật tham khảo từ bài blog "Xây dựng Vietfuel API phiên bản ít RAM"
 *      của tác giả toidicakhia (https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram).
 *   2. [FALLBACK] Playwright headless nếu cấu trúc HTML thay đổi.
 * ========================================================================== */


import * as cheerio from 'cheerio';
import { parsePrice, deduplicate, toISODate, pickMostLikelyPriceDate } from './utils.js';

const SP_BASE_URL = 'https://saigonpetro.com.vn';
const SP_PAGE_URL = `${SP_BASE_URL}/ban-le-xang-dau`;
const FETCH_TIMEOUT_MS = 18000;

const HEADERS = {
  'User-Agent': 'VietFuelBot/1.0 (non-profit; github.com/TranQui004/vietfuel-api)',
  'Accept': 'text/html,*/*',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  'Referer': SP_BASE_URL,
};

/**
 * Tầng 1: HTTP fetch + API động (không cần browser).
 * Bước 1: Lấy trang chính để đọc data-list từ <select id="time">
 * Bước 2: Gọi /load-time?idtime=... để nhận HTML bảng giá
 */
async function scrapeViaHttp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Bước 1: Lấy trang ban đầu
    const res = await fetch(SP_PAGE_URL, { signal: controller.signal, headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Bước 2: Trích xuất tham số idtime
    const selectTag = $('select[id="time"]');
    const dataList = selectTag.attr('data-list');
    if (!dataList) throw new Error('Không tìm thấy select[id=time][data-list]');

    // Bước 3: Gọi API nội bộ lấy bảng giá
    const apiUrl = `${SP_BASE_URL}/load-time?idtime=${dataList}&type=ban-le-xang-dau&eShow=.data-tb`;
    const apiRes = await fetch(apiUrl, { headers: HEADERS });
    if (!apiRes.ok) throw new Error(`API HTTP ${apiRes.status}`);
    const pricesHtml = await apiRes.text();
    // SaigonPetro API trả về HTML fragment (chỉ <thead>+<tbody>) không có <table>
    // Cheerio sẽ drop <tbody> nếu không có <table> bọc ngoài → phải wrap
    const $p = cheerio.load(`<table>${pricesHtml}</table>`);

    const results = [];
    $p('tbody tr').each((_, row) => {
      const cols = $p(row).find('td');
      // Bỏ qua row "Không tìm thấy kết quả" hoặc colspan
      if (cols.length >= 3 && !$p(cols[0]).attr('colspan')) {
        const name = cols.eq(1).text().trim();
        // Giá nằm ở cột 3, dạng "23.750 đ" — dấu chấm là phân cách nghìn
        const rawPrice = cols.eq(2).text().trim();
        if (name) results.push({ name, rawPrice });
      }
    });

    // Lấy ngày từ API response trước ("Kể từ 16 gio 00 phút ngày 02.07.2026" hoặc "ngày 29 tháng 04 năm 2026")
    const apiText = $p.root().text();
    let apiDate = null;
    const dmyMatch = apiText.match(/ngày\s*(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/i);
    if (dmyMatch) {
      apiDate = `${dmyMatch[1].padStart(2,'0')}/${dmyMatch[2].padStart(2,'0')}/${dmyMatch[3]}`;
    } else {
      const apiDateMatch = apiText.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);
      if (apiDateMatch) {
        apiDate = `${apiDateMatch[1].padStart(2,'0')}/${apiDateMatch[2].padStart(2,'0')}/${apiDateMatch[3]}`;
      }
    }

    // Fallback từ trang chính
    const fullText = $.root().text();
    const contextualDate = fullText.match(/(?:Kể\s*Từ|Kể\s*từ)[^\n]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const dateCandidates = Array.from(fullText.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map(m => m[1]);

    return {
      priceRows: results,
      contextualDateTxt: apiDate || (contextualDate ? contextualDate[1] : null),
      dateCandidates,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeSaigonPetro() {
  const start = Date.now();
  let rawData;
  try {
    console.log('[Scraper:SaigonPetro] Đang tải dữ liệu qua HTTP fetch + API động...');
    rawData = await scrapeViaHttp();
  } catch (httpErr) {
    throw new Error(`[Scraper:SaigonPetro] Lỗi HTTP fetch: ${httpErr.message}`);
  }

  const prices = deduplicate(rawData.priceRows.map(p => ({
    name: p.name,
    region1: null,
    region2: null,
    price: parsePrice(p.rawPrice),
    unit: 'VND/lít',
  })).filter(p => !!p.price && /xăng|dầu|ron|do/i.test(p.name)));

  if (!prices.length) throw new Error('Empty dataset from SaigonPetro');
  const strictDate = toISODate(rawData.contextualDateTxt);
  const fallbackDate = pickMostLikelyPriceDate(rawData.dateCandidates, { maxAgeDays: 45, minYear: 2020 });
  const priceDate = strictDate || fallbackDate;
  console.log(`[Scraper:SaigonPetro] Xong. ${prices.length} items. priceDate=${priceDate} (${((Date.now() - start) / 1000).toFixed(2)}s)`);
  return { prices, scrapedAt: new Date().toISOString(), source: SP_PAGE_URL, priceDate };
}

export {  scrapeSaigonPetro  };
