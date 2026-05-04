# CHANGELOG

> Tất cả các thay đổi đáng chú ý của dự án **VietFuel API** sẽ được ghi lại ở đây.
> Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — 2026-05-04

### 🙏 Lời cảm ơn đặc biệt

Phiên bản này được cải thiện đáng kể nhờ bài blog xuất sắc **"Xây dựng Vietfuel API phiên bản ít RAM"** của tác giả **toidicakhia** ([@toidicakhia](https://github.com/toidicakhia)).

Qua bài viết, tác giả đã chỉ ra một cách thẳng thắn và kỹ thuật rằng Playwright — mặc dù mạnh mẽ — là quá tốn tài nguyên cho các nguồn dữ liệu không yêu cầu JavaScript rendering. Đồng thời tác giả cũng chia sẻ kỹ thuật bypass Cloudflare của PVOil bằng cách truy cập IP origin kèm `Host` header — một giải pháp rất thông minh và nhẹ.

Chúng tôi xin phép sử dụng các ý tưởng kỹ thuật này để cải thiện project, và sẽ ghi credit đầy đủ trong source code. Mọi đóng góp và phản hồi của cộng đồng đều là động lực lớn để chúng tôi tiếp tục phát triển dự án này.

- Blog: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
- Demo của tác giả: https://fuelprice.toidicakhia.me

### ✨ Thêm mới
- Script `scripts/update-mockdata.js`: tự động kéo dữ liệu thực từ API rồi ghi đè vào `websites/mock-data/fuel-prices.json` — chỉ cần chạy `npm run update-mockdata` là xong.
- Website demo: thay tab "Đội xe" và "Tài chính" bằng 2 tab biểu đồ trực quan.

### 🔧 Cải thiện (Scraper tối ưu RAM)
Áp dụng chiến lược **"HTTP-first, browser-fallback"** cho các nguồn không yêu cầu JavaScript rendering, giúp giảm đáng kể mức tiêu thụ RAM (từ ~150-200MB/scraper xuống ~0MB khi HTTP thành công):

| Scraper | Thay đổi |
|---|---|
| **Comeco** | Tầng 1 mới: `node-fetch` + `cheerio` parse HTML tĩnh. |
| **Petrotimes** | Tầng 1 mới: Gọi thẳng API nội bộ `/site/get-petro` không cần browser. |
| **SaigonPetro** | Tầng 1 mới: Fetch trang chính → trích xuất `data-list` → gọi API `/load-time` động. |
| **PVOil** | Tầng 0 mới: Bypass Cloudflare qua IP origin `103.21.120.100` với `Host: www.pvoil.com.vn`. |

> Tất cả scraper đều giữ nguyên Playwright làm tầng fallback cuối để đảm bảo tính ổn định.

### 📦 Dependencies
- Thêm `cheerio` và `node-fetch@2` vào `backend/package.json`.

---

## [1.0.0] — 2026-04-01

### ✨ Phát hành lần đầu
- API thu thập giá xăng dầu thời gian thực từ 11 nguồn phân phối chính thức tại Việt Nam.
- Hỗ trợ phân vùng giá Vùng 1 / Vùng 2 theo Nghị định 80/2023/NĐ-CP.
- Cơ chế Adaptive Cron thông minh dựa theo lịch điều hành giá của Nhà nước.
- Hệ thống Cache đa tầng, Stale-While-Revalidate.
- Demo FleetOps Dashboard tại `websites/`.

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
