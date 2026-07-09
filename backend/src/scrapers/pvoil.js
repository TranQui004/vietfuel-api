/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 *
 * Licensed under the MIT License.
 * See LICENSE file for details.
 */
'use strict';

/**
 * [SCRAPER: PVOil] â€” Chiáº¿n lÆ°á»£c 4 táº§ng
 *
 * Táº§ng 0: HTTPS IP origin bypass (103.21.120.100, cert há»£p lá»‡).
 *         API: GET /api/oilprice/load-view â€” tráº£ HTML báº£ng giÃ¡.
 *         **5 sáº£n pháº©m bÃ¡n láº»**: RON 95-III, E10 RON 95-III, E5 RON 92-II,
 *         DO 0,05S-II, DO 0,001S-V. KhÃ´ng cÃ³ Mazut vÃ  Dáº§u há»a (bÃ¡n buÃ´n riÃªng).
 *         Credit: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
 *
 * Táº§ng 1: Fetch trá»±c tiáº¿p pvoil.com.vn + stealth headers (thÆ°á»ng bá»‹ CF cháº·n).
 *
 * Táº§ng 2: giaxanghomnay.com JSON API â€” GET /api/pvdate/{YYYY-MM-DD}
 *         Tráº£ array: [0]=Petrolimex, [1]=PVOil, [2]=Petrolimex_hÃ´m_qua, [3]=PVOil_hÃ´m_qua
 *         PVOil items: { title, price }  â€” **4/5 sáº£n pháº©m** (thiáº¿u Mazut 180CST).
 *         Mazut lÃ  sáº£n pháº©m cÃ´ng nghiá»‡p, chá»‰ GXHN khÃ´ng niÃªm yáº¿t.
 *         ÄÃ¢y lÃ  source fallback Ä‘Ã¡ng tin cáº­y nháº¥t khi pvoil.com.vn bá»‹ CF block.
 *
 * Táº§ng 3: petrotimesgroup.com/site/get-petro â€” HTML tÄ©nh SSR, giÃ¡ Petrolimex.
 *         3/5 sáº£n pháº©m PVOil trÃ¹ng Petrolimex (RON95, E5, DO 0,05). Fallback cuá»‘i.
 */

import https from 'node:https';
import * as cheerio from 'cheerio';
import { parsePrice, deduplicate, pickRandomUA } from './utils.js';
import {
  isAntiBotPage,
  extractDateFromText,
  extractPvoilPricesFromText,
  mapLineToCanonical,
} from './pvoil-parser.js';

function httpsGetBypass(url, hostHeader) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Host': hostHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9',
        'Referer': 'https://www.pvoil.com.vn/',
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Táº§ng 0: IP Origin bypass (HTTP port 80)
// pvoil.com.vn niÃªm yáº¿t 5 sáº£n pháº©m: RON 95-III, E5 RON 92-II,
// DO 0,05S-II, Dáº§u há»a 2-K, Mazut 180CST 3.5S.
// IP origin 103.21.120.100 hoat dong qua HTTPS, cert SSL hop le cho pvoil.com.vn.
// 5 san pham: RON 95-III, E10 RON 95-III, E5 RON 92-II, DO 0,05S-II, DO 0,001S-V.
// Credit: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function scrapeFromOriginIP() {
  // IP origin 103.21.120.100 vẫn hoạt động qua HTTPS, cert SSL hợp lệ cho www.pvoil.com.vn.
  // Fetch HTTPS + Host header — không cần ssl=False, cert pass strict validation.
  const PVOIL_ORIGIN_IPS = [
    '103.21.120.100', // IP origin hiện tại
  ];

  const TARGETS = PVOIL_ORIGIN_IPS.flatMap(ip => [
    `https://${ip}/api/oilprice/load-view`,
    `https://${ip}/`,
  ]);


  let html = null;
  let lastErr = null;

  for (const targetUrl of TARGETS) {
    try {
      const res = await httpsGetBypass(targetUrl, 'www.pvoil.com.vn');
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} từ ${targetUrl}`); continue; }
      const text = await res.text();
      // Reject nếu bị Cloudflare JS challenge
      if (text && text.length > 500 && text.includes('<') && !text.includes('__cf_chl') && !text.includes('just a moment')) {
        html = text;
        break;
      }
    } catch (e) { lastErr = e; }
  }

  if (!html) throw lastErr || new Error('PVOil IP origin: táº¥t cáº£ URL tháº¥t báº¡i hoáº·c bá»‹ Cloudflare');

  const $ = cheerio.load(html);
  const results = [];

  // Cáº¥u trÃºc: STT | TÃªn sáº£n pháº©m | GiÃ¡ (VND/lÃ­t) | Biáº¿n Ä‘á»™ng
  $('tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length < 3) return;
    const rawName  = cols.eq(1).text().trim();
    const priceRaw = cols.eq(2).text().trim();
    const parsed   = parsePrice(priceRaw);
    if (!rawName || !parsed) return;
    const canonicalName = mapLineToCanonical(rawName);
    if (!canonicalName) return;
    results.push({ name: canonicalName, region1: null, region2: null, price: parsed, unit: 'VND/lít' });
  });

  if (!results.length) throw new Error('IP origin: parse Ä‘Æ°á»£c HTML nhÆ°ng khÃ´ng tÃ¬m tháº¥y báº£ng giÃ¡ PVOil');

  const fullText = $.root().text();
  return {
    prices: deduplicate(results),
    scrapedAt: new Date().toISOString(),
    source: 'https://www.pvoil.com.vn',
    priceDate: extractDateFromText(fullText),
    priceDateSource: 'pvoil-origin-ip-http',
    priceAnnouncedAt: null,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Táº§ng 1: Direct stealth fetch pvoil.com.vn
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function scrapeFromPvoilDirect() {
  const res = await fetch('https://www.pvoil.com.vn', {
    headers: {
      'User-Agent': pickRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'Referer': 'https://www.google.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} tá»« PVOil direct`);
  const html = await res.text();

  const $ = cheerio.load(html);
  const bodyText = $.root().text();
  if (isAntiBotPage(bodyText, $('title').text())) {
    throw new Error('Trang PVOil bá»‹ Cloudflare cháº·n (HTTP direct).');
  }

  const prices = extractPvoilPricesFromText(bodyText);
  if (!prices.length) throw new Error('KhÃ´ng parse Ä‘Æ°á»£c giÃ¡ tá»« PVOil direct HTTP.');

  return {
    prices,
    scrapedAt: new Date().toISOString(),
    source: 'https://www.pvoil.com.vn',
    priceDate: extractDateFromText(bodyText),
    priceDateSource: 'pvoil-direct-http',
    priceAnnouncedAt: null,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Táº§ng 2: giaxanghomnay.com JSON API
// GET /api/pvdate/{YYYY-MM-DD}
// Tráº£: [ [petrolimex_items], [pvoil_items], [petrolimex_prev], [pvoil_prev] ]
// PVOil items: { id, date, title, price }
// 4 sáº£n pháº©m: RON 95-III, E5 RON 92-II, Dáº§u KO, Dáº§u DO 0,05S-II
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function scrapeFromGXHN() {
  // Thá»­ ngÃ y hÃ´m nay, náº¿u khÃ´ng cÃ³ thÃ¬ thá»­ hÃ´m qua vÃ  ká»³ Ä‘iá»u chá»‰nh gáº§n nháº¥t
  const today = new Date();
  const DATES_TO_TRY = [];

  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    DATES_TO_TRY.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }

  const GXHN_BASE = 'https://giaxanghomnay.com';
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'vi-VN,vi;q=0.9',
    'Referer': `${GXHN_BASE}/`,
    'X-Requested-With': 'XMLHttpRequest',
  };

  for (const dateStr of DATES_TO_TRY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let data;
      try {
        const res = await fetch(`${GXHN_BASE}/api/pvdate/${dateStr}`, {
          signal: controller.signal,
          headers: HEADERS,
        });
        if (!res.ok) continue;
        data = await res.json();
      } finally { clearTimeout(timer); }

      // data[1] = mảng PVOil items: [{ title, price }, ...]
      if (!Array.isArray(data) || !Array.isArray(data[1]) || data[1].length < 2) continue;

      const pvoilItems = data[1];
      const petrolimexItems = data[0] || [];
      const results = [];

      for (const item of pvoilItems) {
        if (!item.title || item.price == null) continue;
        const canonicalName = mapLineToCanonical(item.title);
        if (!canonicalName) continue; // bỏ qua sản phẩm không map được
        results.push({
          name: canonicalName,
          region1: null, // PVOil không phân vùng
          region2: null,
          price: item.price,
          unit: 'VND/lít',
        });
      }

      // Bổ sung Xăng E10 RON 95-III hoặc Xăng RON 95-III từ Petrolimex nếu PVOil bị thiếu
      const hasRon95 = results.some(r => r.name && r.name.includes('RON 95'));
      if (!hasRon95 && petrolimexItems.length > 0) {
        const plxRon95 = petrolimexItems.find(item => {
          if (!item.title) return false;
          const canonical = mapLineToCanonical(item.title);
          return canonical && canonical.includes('RON 95');
        });
        if (plxRon95) {
          const canonicalName = mapLineToCanonical(plxRon95.title);
          results.push({
            name: canonicalName,
            region1: null,
            region2: null,
            price: plxRon95.zone1_price || plxRon95.price || null,
            unit: 'VND/lít',
          });
        }
      }

      if (results.length < 2) continue;

      // Lấy ngày từ field date của item đầu tiên: "2026-05-15 00:00:00" → "15/05/2026"
      let priceDate = null;
      if (pvoilItems[0]?.date) {
        const raw = String(pvoilItems[0].date).slice(0, 10); // YYYY-MM-DD
        const [y, m, d] = raw.split('-');
        priceDate = `${d}/${m}/${y}`;
      }

      return {
        prices: deduplicate(results),
        scrapedAt: new Date().toISOString(),
        source: 'https://giaxanghomnay.com',
        priceDate,
        priceDateSource: 'pvoil-gxhn',
        priceAnnouncedAt: null,
      };
    } catch (e) {
      console.warn(`[Scraper:PVOil] GXHN API ${dateStr} lá»—i: ${e.message}`);
    }
  }

  throw new Error('[Scraper:PVOil] Táº§ng 2 GXHN JSON API: khÃ´ng láº¥y Ä‘Æ°á»£c dá»¯ liá»‡u PVOil trong 7 ngÃ y gáº§n nháº¥t.');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Táº§ng 3: petrotimesgroup.com â€” giÃ¡ Petrolimex SSR (tham chiáº¿u)
// 3/5 sáº£n pháº©m PVOil trÃ¹ng Petrolimex. Dáº§u há»a & Mazut sáº½ thiáº¿u.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function scrapeFromPetrotimesGroup() {
  const res = await fetch('https://petrotimesgroup.com/site/get-petro', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html, */*',
      'Referer': 'https://petrotimesgroup.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} tá»« petrotimesgroup`);

  const html = await res.text();
  if (!html || html.length < 100) throw new Error('Response rá»—ng tá»« petrotimesgroup');

  const $ = cheerio.load(html);
  const results = [];

  // div.table-item > p[0]=tÃªn, p[1]=vÃ¹ng1, p[2]=vÃ¹ng2
  $('.table-item').each((_, item) => {
    if ($(item).hasClass('font-weight-bold')) return; // skip header
    const ps = $(item).find('p');
    if (ps.length < 2) return;

    const rawName = ps.eq(0).text().trim();
    const v1Raw   = ps.eq(1).text().trim();
    const v2Raw   = ps.length >= 3 ? ps.eq(2).text().trim() : '';
    const v1Price = parsePrice(v1Raw);
    const v2Price = parsePrice(v2Raw);
    if (!rawName || !v1Price) return;

    const canonicalName = mapLineToCanonical(rawName);
    if (!canonicalName) return;

    results.push({
      name: canonicalName,
      region1: v1Price,
      region2: v2Price || null,
      price: v1Price,
      unit: 'VND/lÃ­t',
    });
  });

  if (results.length < 2) {
    throw new Error(`Petrotimesgroup: chá»‰ parse Ä‘Æ°á»£c ${results.length} sáº£n pháº©m (cáº§n >= 2)`);
  }

  const bodyText = $.root().text();
  return {
    prices: deduplicate(results),
    scrapedAt: new Date().toISOString(),
    source: 'https://www.pvoil.com.vn',
    priceDate: extractDateFromText(bodyText),
    priceDateSource: 'pvoil-petrotimesgroup',
    priceAnnouncedAt: null,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Orchestrator: 4 táº§ng cascading
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function scrapePVOil() {
  console.log('[Scraper:PVOil] Báº¯t Ä‘áº§u cÃ o dá»¯ liá»‡u (chiáº¿n lÆ°á»£c 4 táº§ng)...');
  const start   = Date.now();
  const elapsed = () => ((Date.now() - start) / 1000).toFixed(2) + 's';

  // Táº§ng 0: IP bypass HTTP port 80
  try {
    const result = await scrapeFromOriginIP();
    result._tier = 0;
    console.log(`[Scraper:PVOil] [Táº§ng 0] âœ“ IP bypass HTTP (${elapsed()}) â€” ${result.prices.length} sáº£n pháº©m`);
    return result;
  } catch (e) {
    console.warn(`[Scraper:PVOil] [Táº§ng 0] âœ— ${e.message}`);
  }

  // Táº§ng 1: Direct stealth fetch pvoil.com.vn
  try {
    const result = await scrapeFromPvoilDirect();
    result._tier = 1;
    console.log(`[Scraper:PVOil] [Táº§ng 1] âœ“ Direct pvoil.com.vn (${elapsed()}) â€” ${result.prices.length} sáº£n pháº©m`);
    return result;
  } catch (e) {
    console.warn(`[Scraper:PVOil] [Táº§ng 1] âœ— ${e.message}`);
  }

  // Táº§ng 2: GXHN JSON API (/api/pvdate/{date}) â€” 4 sáº£n pháº©m PVOil thá»±c táº¿
  try {
    const result = await scrapeFromGXHN();
    result._tier = 2;
    result.blockedByProtection = true;
    console.log(`[Scraper:PVOil] [Táº§ng 2] âœ“ GXHN JSON API (${elapsed()}) â€” ${result.prices.length} sáº£n pháº©m`);
    return result;
  } catch (e) {
    console.warn(`[Scraper:PVOil] [Táº§ng 2] âœ— ${e.message}`);
  }

  // Táº§ng 3: Petrotimesgroup â€” giÃ¡ Petrolimex tham chiáº¿u (3 sáº£n pháº©m trÃ¹ng)
  try {
    const result = await scrapeFromPetrotimesGroup();
    result._tier = 3;
    result.blockedByProtection = true;
    console.log(`[Scraper:PVOil] [Táº§ng 3] âœ“ Petrotimesgroup (${elapsed()}) â€” ${result.prices.length} sáº£n pháº©m`);
    return result;
  } catch (e) {
    console.error(`[Scraper:PVOil] [Táº§ng 3] âœ— ${e.message}`);
    throw new Error('[Scraper:PVOil] Táº¥t cáº£ 4 táº§ng Ä‘á»u tháº¥t báº¡i. Há»‡ thá»‘ng sáº½ dÃ¹ng Stale Cache.');
  }
}

export { scrapePVOil };

