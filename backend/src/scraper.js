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
 * [TỔNG HỢP SCRAPER] Điểm tập kết export cho các bộ cào dữ liệu.
 *
 * Nhiệm vụ: Chứa danh sách require của tất cả hệ thống tải trang tĩnh bằng 
 * trình duyệt headless (Playwright) nằm trong thư mục `scrapers/`.
 * File này đóng vai trò điểm vào để đảm bảo tính module hoá 
 * của ứng dụng sau khi đã cấu trúc lại hệ thống thành các file con nhỏ.
 * ========================================================================== */

import { scrapePetrolimex } from './scrapers/petrolimex.js';
import { scrapePVOil } from './scrapers/pvoil.js';
import { scrapeMipec } from './scrapers/mipec.js';
import { scrapeWebGia } from './scrapers/webgia.js';
import { scrapeGiaxanghomnay, scrapeProvincePrice } from './scrapers/giaxanghomnay.js';
import { scrapeSaigonPetro } from './scrapers/saigonpetro.js';
import { scrapeComeco } from './scrapers/comeco.js';
import { scrapePetrotimes } from './scrapers/petrotimes.js';

/* ==========================================================================
 * [DEBUG CLI] Chế độ chạy độc lập khi gọi trực tiếp từ terminal.
 * ========================================================================== */
export default { 
  scrapePetrolimex,
  scrapePVOil,
  scrapeMipec,
  scrapeWebGia,
  scrapeGiaxanghomnay,
  scrapeProvincePrice,
  scrapeSaigonPetro,
  scrapeComeco,
  scrapePetrotimes
};

