/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 *
 * Licensed under the MIT License.
 * See LICENSE file for details.
 */
'use strict';

import { parsePrice, deduplicate, pickMostLikelyPriceDate } from './utils.js';

// Danh sách sản phẩm chính thức niêm yết tại pvoil.com.vn.
// Nguồn tham khảo: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
// API /api/oilprice/load-view trả về bảng giá bán lẻ với cột:
// STT | Tên sản phẩm | Giá (VND/lít) | Biến động
// 5 sản phẩm thực tế (xác nhận 15/05/2026):
// 1. Xăng RON 95-III
// 2. Xăng E10 RON 95-III   ← sản phẩm mới (E10 thay thế E5 trong nhóm RON 95)
// 3. Xăng E5 RON 92-II
// 4. Dầu DO 0,05S-II
// 5. Dầu DO 0,001S-V       ← dầu diesel siêu sạch (thêm mới)
const PRODUCT_SPECS = [
  {
    name: 'Xăng RON 95-III',
    matcher: /xăng\s*ron\s*95\s*[-–]?\s*iii\b(?!\s*e)/i,  // không match E10 RON 95
  },
  {
    name: 'Xăng E10 RON 95-III',
    matcher: /xăng\s*e10\s*ron\s*95\s*[-–]?\s*iii\b/i,
  },
  {
    name: 'Xăng E5 RON 92-II',
    matcher: /xăng\s*e5\s*ron\s*92\s*[-–]?\s*ii\b/i,
  },
  {
    name: 'DO 0,05S-II',
    // Chuẩn hóa: cả "Dầu DO 0,05S-II" và "DO 0,05S-II" đều map về tên này
    matcher: /(dầu\s*)?do\s*0[,.]?05\s*s?\s*[-–]?\s*ii\b/i,
  },
  {
    name: 'DO 0,001S-V',
    // Dầu diesel siêu sạch DO 0,001S-V (Euro 5)
    matcher: /(dầu\s*)?do\s*0[,.]?001\s*s?\s*[-–]?\s*v\b/i,
  },
  // Fallback: có thể PVOil thêm lại sau này
  {
    name: 'Dầu hỏa 2-K',
    // "dầu hỏa", "dầu 2-K", "kerosene 2-K", "Dầu KO" (GXHN notation)
    matcher: /(dầu\s*(hỏa|hoa|2\s*[-–]?\s*k|ko)|kerosene\s*2[-–]?k)\b/i,
  },
  {
    name: 'Dầu Mazut 180CST 3.5S',
    // Chỉ match mazut/FO 180 — không match "3.5S" đơn độc vì trùng với giá DO
    matcher: /(mazut|fo\s*180|180\s*cst)\b/i,
  },
];

const START_MARKERS = [
  'giá theo pvoil',
  'gia theo pvoil',
  'theo pvoil',
  'pvoil',
];

const END_MARKERS = [
  'giá theo petrolimex',
  'giá theo mipec',
  'giá theo comeco',
  'giá theo saigonpetro',
  'giá theo petrotimes',
  'giá theo webgia',
  'giá theo giaxanghomnay',
  'theo petrolimex',
  'theo mipec',
  'theo comeco',
  'theo saigonpetro',
  'theo petrotimes',
  'theo webgia',
  'theo giaxanghomnay',
];

const PRICE_PATTERN = /\d{2}[,.]\d{3}(?:[,.]\d{3})?/g;
const DATE_PATTERN = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g;

function isAntiBotPage(text = '', title = '') {
  const combined = `${title}\n${text}`.toLowerCase();
  return [
    'just a moment',
    'security verification',
    'enable javascript and cookies to continue',
    'cloudflare',
    '__cf_chl',
  ].some((s) => combined.includes(s));
}

function extractDateFromText(text) {
  const candidates = [...String(text || '').matchAll(DATE_PATTERN)].map((m) => m[1]);
  return pickMostLikelyPriceDate(candidates, { maxAgeDays: 30 }) || null;
}

function findPvoilSection(text) {
  const whole = String(text || '');
  const lower = whole.toLowerCase();

  let start = -1;
  for (const marker of START_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) {
      start = idx;
      break;
    }
  }

  if (start === -1) return whole;

  let end = Math.min(whole.length, start + 8000);
  const afterStart = lower.slice(start + 1);
  for (const marker of END_MARKERS) {
    const idx = afterStart.indexOf(marker);
    if (idx !== -1) {
      end = Math.min(end, start + 1 + idx);
    }
  }

  return whole.slice(start, end);
}

function mapLineToCanonical(line) {
  for (const spec of PRODUCT_SPECS) {
    if (spec.matcher.test(line)) return spec.name;
  }
  return null;
}

function extractPvoilPricesFromText(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const rawPrices = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    const canonicalName = mapLineToCanonical(line);
    if (!canonicalName) continue;

    const pricesInLine = line.match(PRICE_PATTERN) || [];
    const pricesInNextLine = nextLine.match(PRICE_PATTERN) || [];
    const candidate = pricesInLine.at(-1) || pricesInNextLine.at(0) || null;
    const parsed = parsePrice(candidate || '');

    if (parsed !== null) {
      rawPrices.push({
        name: canonicalName,
        region1: null,
        region2: null,
        price: parsed,
        unit: 'VND/lít',
      });
    }
  }

  // Fallback quét theo cụm gần nhau nếu dữ liệu xuống dòng bất thường.
  if (rawPrices.length === 0) {
    const whole = String(text || '');
    for (const spec of PRODUCT_SPECS) {
      const nearRegex = new RegExp(`${spec.matcher.source}[\\s\\S]{0,110}?(${PRICE_PATTERN.source})`, 'gi');
      let match;
      while ((match = nearRegex.exec(whole)) !== null) {
        const parsed = parsePrice(match[1]);
        if (parsed !== null) {
          rawPrices.push({
            name: spec.name,
            region1: null,
            region2: null,
            price: parsed,
            unit: 'VND/lít',
          });
        }
      }
    }
  }

  const finalPrices = deduplicate(rawPrices);
  if (finalPrices.length < 3) return []; // Phòng trường hợp quét nhầm tin tức báo chí chỉ chứa 1-2 giá
  return finalPrices;
}

export { 
  isAntiBotPage,
  extractDateFromText,
  findPvoilSection,
  extractPvoilPricesFromText,
  mapLineToCanonical,
  PRODUCT_SPECS,
 };

