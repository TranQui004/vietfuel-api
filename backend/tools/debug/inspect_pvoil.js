/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 * All rights reserved.
 * 
 * This source code is the intellectual property of TranQui.
 * Community contributions and pull requests are highly welcomed!
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.pvoil.com.vn/tin-gia-xang-dau', { waitUntil: 'domcontentloaded' });

  // [BƯỚC 1] Chờ trang hoàn tất render động.
  await page.waitForTimeout(3000);

  // [BƯỚC 2] In nhanh nội dung text để kiểm tra trạng thái anti-bot.
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.substring(0, 2000));

  // [BƯỚC 3] Nếu không có bảng, lưu HTML để phục vụ phân tích parser.
  const tables = await page.evaluate(() => Array.from(document.querySelectorAll('table')).map(t => t.outerHTML));
  if (tables.length > 0) {
    console.log('So bang tim thay:', tables.length);
  } else {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, 'pvoil_dump.html');

    const html = await page.content();
    fs.writeFileSync(outputFile, html, 'utf-8');
    console.log('Da luu HTML phan tich tai:', outputFile);
  }

  await browser.close();
})();

