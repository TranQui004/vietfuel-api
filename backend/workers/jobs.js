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
 * [BACKGROUND JOBS] - Quản lý Cron Jobs và Scraping Định Kỳ
 *
 * Thiết kế theo Nghị định 80/2023/NĐ-CP — điều chỉnh giá vào Thứ Năm hàng tuần:
 *
 *   MODE 1 — Checking    (Thứ 2 → Thứ 4):  4 tiếng/lần
 *   MODE 2 — Hunting     (Thứ 5, 14:30–16:00): 15 phút/lần  ← Khung giờ điều chỉnh giá
 *   MODE 3 — Maintenance (Thứ 6 → Chủ Nhật): 6 tiếng/lần
 *
 * Mục đích: Tiết kiệm tài nguyên server và đảm bảo API cập nhật sớm nhất
 * khi Nhà nước công bố giá mới (thường có hiệu lực lúc ~15:00 Thứ Năm).
 *
 * Tham chiếu pháp lý:
 *   - NĐ 80/2023/NĐ-CP: Điều chỉnh giá mỗi 7 ngày (Thứ Năm hàng tuần)
 *     https://vanban.chinhphu.vn/?pageid=27160&docid=208982
 *   - NĐ 95/2021/NĐ-CP: Cơ chế Quỹ bình ổn và công thức tính giá
 *     https://vanban.chinhphu.vn/?pageid=27160&docid=204393
 *   - NĐ 83/2014/NĐ-CP: Nghị định gốc về kinh doanh xăng dầu
 * ========================================================================== */

const cron = require('node-cron');
const {
  scrapePetrolimex, scrapePVOil, scrapeMipec, scrapeWebGia,
  scrapeGiaxanghomnay, scrapeSaigonPetro, scrapeComeco, scrapePetrotimes,
} = require('../services/scraper');
const { updateFuelPrices } = require('../services/cache');

// Các mirror regional của Petrolimex, đồng bộ từ nguồn chính
const PETROLIMEX_MIRROR_SOURCES = [
  { key: 'kv2_petrolimex',     url: 'https://kv2.petrolimex.com.vn' },
  { key: 'saigon_petrolimex',  url: 'https://saigon.petrolimex.com.vn' },
  { key: 'vungtau_petrolimex', url: 'https://vungtau.petrolimex.com.vn' },
];

// Tùy chọn múi giờ dùng cho tất cả cron schedules
const CRON_OPTS = { timezone: 'Asia/Ho_Chi_Minh' };

/**
 * Trình bọc thực thi tác vụ scrape.
 * Nếu một nguồn lỗi, server vẫn sống và báo lỗi riêng lẻ.
 *
 * @param {string} source - Tên nguồn đang cào.
 * @param {Function} fn - Async function scrape theo nguồn.
 * @param {import('winston').Logger} logger
 */
async function runJob(source, fn, logger) {
  try {
    logger.info(`[Job] Cào dữ liệu từ ${source}...`);
    const result = await fn();
    updateFuelPrices(source, result);

    // Đồng bộ 3 mirror Petrolimex regional từ nguồn chính
    if (source === 'petrolimex' && result?.prices?.length) {
      PETROLIMEX_MIRROR_SOURCES.forEach(({ key, url }) => {
        updateFuelPrices(key, { ...result, source: url });
      });
      logger.info('[Job] Đồng bộ mirror Petrolimex KV2/SAIGON/VUNGTAU từ nguồn chính.');
    }
  } catch (err) {
    logger.error(`[Job] Lỗi khi cào ${source}: ${err.message}. Tiếp tục dùng cache cũ.`);
  }
}

/**
 * Chạy tuần tự tất cả scraper jobs.
 *
 * @param {string} mode - Tên chế độ để ghi vào log (checking/hunting/maintenance/bootstrap).
 * @param {import('winston').Logger} logger
 */
async function runJobsSequentially(mode, logger) {
  logger.info(`[Jobs] === Bắt đầu chu kỳ cào dữ liệu (${mode}) ===`);
  await runJob('petrolimex',    scrapePetrolimex,    logger);
  await runJob('pvoil',         scrapePVOil,          logger);
  await runJob('mipec',         scrapeMipec,          logger);
  await runJob('webgia',        scrapeWebGia,         logger);
  await runJob('saigonpetro',   scrapeSaigonPetro,    logger);
  await runJob('giaxanghomnay', scrapeGiaxanghomnay,  logger);
  // Nguồn phụ trợ chạy sau
  await runJob('comeco',        scrapeComeco,         logger);
  await runJob('petrotimes',    scrapePetrotimes,     logger);
  logger.info(`[Jobs] === Hoàn thành chu kỳ cào dữ liệu (${mode}) ===`);
}

/**
 * Khởi động scrape lần đầu và thiết lập adaptive cron schedule 3 chế độ.
 *
 * @param {Object} _config - Config object (không dùng trực tiếp — giữ để tương thích API cũ).
 * @param {import('winston').Logger} logger
 */
function startJobs(_config, logger) {
  const SKIP = /^(1|true|yes)$/i.test(String(process.env.SKIP_BOOTSTRAP_JOBS || ''));

  if (SKIP) {
    logger.warn('[Jobs] SKIP_BOOTSTRAP_JOBS=true → Bỏ qua auto-scrape khi khởi động và cron jobs.');
    return;
  }

  // Scrape lần đầu ngay khi server khởi động (non-blocking để server kịp listen)
  runJobsSequentially('bootstrap', logger).catch((err) =>
    logger.error(`[Jobs] Lỗi khi chạy jobs lần đầu: ${err.message}`)
  );

  /* -------------------------------------------------------------------------
   * MODE 1 — CHECKING (Thứ 2 → Thứ 4): mỗi 4 tiếng
   * Giá ổn định, không có thay đổi — tần suất thấp để tiết kiệm tài nguyên.
   * ------------------------------------------------------------------------- */
  cron.schedule('0 */4 * * 1-3', () => {
    runJobsSequentially('checking', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron checking: ${err.message}`)
    );
  }, CRON_OPTS);

  /* -------------------------------------------------------------------------
   * MODE 2a — HUNTING-PRE (Thứ 5, 0h–12h): mỗi 4 tiếng
   * Thứ Năm trước giờ công bố — duy trì nhịp cào để cache không cũ.
   * ------------------------------------------------------------------------- */
  cron.schedule('0 0,4,8,12 * * 4', () => {
    runJobsSequentially('hunting-pre', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron hunting-pre: ${err.message}`)
    );
  }, CRON_OPTS);

  /* -------------------------------------------------------------------------
   * MODE 2b — HUNTING (Thứ 5, 14:30–16:00): mỗi 15 phút
   * Khung giờ vàng — giá thường được Bộ Công Thương công bố và có hiệu lực ~15:00.
   * API cần phản ánh giá mới sớm nhất có thể.
   * ------------------------------------------------------------------------- */
  cron.schedule('30,45 14 * * 4', () => {
    runJobsSequentially('hunting', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron hunting: ${err.message}`)
    );
  }, CRON_OPTS);

  cron.schedule('0,15,30,45 15 * * 4', () => {
    runJobsSequentially('hunting', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron hunting: ${err.message}`)
    );
  }, CRON_OPTS);

  cron.schedule('0 16 * * 4', () => {
    runJobsSequentially('hunting', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron hunting: ${err.message}`)
    );
  }, CRON_OPTS);

  /* -------------------------------------------------------------------------
   * MODE 2c — HUNTING-POST (Thứ 5, 20h): 1 lần xác nhận sau công bố
   * ------------------------------------------------------------------------- */
  cron.schedule('0 20 * * 4', () => {
    runJobsSequentially('hunting-post', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron hunting-post: ${err.message}`)
    );
  }, CRON_OPTS);

  /* -------------------------------------------------------------------------
   * MODE 3 — MAINTENANCE (Thứ 6 → Chủ Nhật): mỗi 6 tiếng
   * Giá đã ổn định sau công bố — giảm tần suất để tiết kiệm băng thông server.
   * ------------------------------------------------------------------------- */
  cron.schedule('0 */6 * * 5,6,0', () => {
    runJobsSequentially('maintenance', logger).catch((err) =>
      logger.error(`[Jobs] Lỗi cron maintenance: ${err.message}`)
    );
  }, CRON_OPTS);

  logger.info('[Jobs] ✅ Adaptive cron đã kích hoạt (múi giờ: Asia/Ho_Chi_Minh)');
  logger.info('[Jobs]    MODE 1 — Checking    (T2–T4)         : mỗi 4 giờ');
  logger.info('[Jobs]    MODE 2 — Hunting     (T5, 14:30–16:00): mỗi 15 phút');
  logger.info('[Jobs]    MODE 3 — Maintenance (T6–CN)         : mỗi 6 giờ');
  logger.info('[Jobs]    ⚖️  Cơ sở: NĐ 80/2023/NĐ-CP — điều chỉnh giá Thứ Năm hàng tuần');
}

module.exports = { startJobs };


