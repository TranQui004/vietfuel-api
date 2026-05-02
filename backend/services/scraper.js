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
 * [TỔNG HỢP SCRAPER] Điểm tập kết export cho các bộ cào dữ liệu.
 *
 * Nhiệm vụ: Chứa danh sách require của tất cả hệ thống tải trang tĩnh bằng 
 * trình duyệt headless (Playwright) nằm trong thư mục `scrapers/`.
 * File này đóng vai trò điểm vào để đảm bảo tính module hoá 
 * của ứng dụng sau khi đã cấu trúc lại hệ thống thành các file con nhỏ.
 * ========================================================================== */

const { scrapePetrolimex } = require('./scrapers/petrolimex');
const { scrapePVOil } = require('./scrapers/pvoil');
const { scrapeMipec } = require('./scrapers/mipec');
const { scrapeWebGia } = require('./scrapers/webgia');
const { scrapeGiaxanghomnay, scrapeProvincePrice } = require('./scrapers/giaxanghomnay');
const { scrapeSaigonPetro } = require('./scrapers/saigonpetro');
const { scrapeComeco } = require('./scrapers/comeco');
const { scrapePetrotimes } = require('./scrapers/petrotimes');

/* ==========================================================================
 * [DEBUG CLI] Chế độ chạy độc lập khi gọi trực tiếp từ terminal.
 * ========================================================================== */
if (require.main === module) {
  const arg = process.argv[2] || 'petrolimex';
  const scrapers = { petrolimex: scrapePetrolimex, pvoil: scrapePVOil, mipec: scrapeMipec, webgia: scrapeWebGia, giaxanghomnay: scrapeGiaxanghomnay, saigonpetro: scrapeSaigonPetro, comeco: scrapeComeco, petrotimes: scrapePetrotimes };

  let fn;
  if (arg.startsWith('province:')) {
    const slug = arg.split(':')[1];
    fn = () => scrapeProvincePrice(slug);
  } else {
    fn = scrapers[arg] || scrapePetrolimex;
  }

  fn()
    .then((result) => {
      console.log('\nKết quả cào dữ liệu:');
      console.table(result.prices);
      console.log('\nMetadata:', { scrapedAt: result.scrapedAt, priceDate: result.priceDate, source: result.source });
      if (result.provinceName) console.log('Tỉnh:', result.provinceName, 'Vùng:', result.region);
      process.exit(0);
    })
    .catch((err) => { console.error('Lỗi:', err.message); process.exit(1); });
}

module.exports = {
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

