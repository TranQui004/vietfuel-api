# CHANGELOG

> Tất cả các thay đổi đáng chú ý của dự án **VietFuel API** sẽ được ghi lại ở đây.
> Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [4.0.0] — 2026-07-09 (latest)

### 🖥️ CLI Console Dashboard
- **Interactive CLI Dashboard (`npm run cli`):** Created a terminal-based visual dashboard application utilizing ANSI terminal colors and ASCII grid tables for administrators to inspect prices, query logs, review health/storage state, and clear KV caches without browser access.

### 📊 Lịch sử Giá & Dọn dẹp Tự động (SQLite)
- **Tự động dọn dẹp lịch sử (Auto-Pruning):** Bổ sung cơ chế tự động dọn dẹp các bản ghi lịch sử lớn hơn 90 ngày sau khi cào và chèn dữ liệu mới thành công.
- **Tương thích driver SQLite:** Chuyển đổi toàn bộ câu lệnh SQLite sang dạng positional parameters (`?`) chuẩn để loại bỏ lỗi `RangeError` trên driver `better-sqlite3`.

### ⚡ Cải thiện Hệ thống API & Cache
- **Đường dẫn lưu trữ Health Check:** Endpoint `/api/health` được nâng cấp trả về thêm thông tin chi tiết về loại cache và đường dẫn thư mục lưu trữ cơ sở dữ liệu.
- **Bổ sung dọn dẹp Cache động:** Endpoint `/api/clear-cache` hỗ trợ xóa động toàn bộ các namespace của cache tỉnh thành (`province:*`) thông qua cơ chế liệt kê prefix.

### 🔄 Scrapers
- **PVOil bypass Cloudflare (Tầng 0):** Cấu hình module `https` nội bộ Node để bỏ qua xác thực SSL altname (`rejectUnauthorized: false`), cho phép fetch trực tiếp bảng giá từ IP origin `103.21.120.100` thành công 100%.
- **Saigon Petro Date Regex:** Sửa biểu thức chính quy của Saigon Petro để nhận diện các định dạng ngày phân tách bằng dấu chấm (VD: `ngày 02.07.2026`).

---

## [3.1.0] — 2026-05-21

### 📊 Lịch sử Giá & Thống Kê (D1 SQLite)
- **Tích hợp Cloudflare D1 / SQLite:** Bổ sung database lưu trữ lịch sử các kỳ điều chỉnh giá xăng dầu (`backend/src/db/repository.js`).
- **Endpoint mới `/api/history`:** Hỗ trợ truy xuất lịch sử với tham số `limit` (mặc định 500) và filter theo tên nhiên liệu.
### Giao diện (Frontend)
- Làm lại toàn bộ giao diện trang **Lịch sử Giá** (`/history`) thành **Thống kê Tổng quan**.
- Chuyển đổi biểu đồ Line/Area cũ sang **Grouped Column Chart** để theo dõi giá Vùng 1 / Vùng 2 rõ ràng hơn.
- Thêm tính năng **Lọc (Filter)** theo nguồn và **Sắp xếp (Sort)** cột thông minh.
- Loại bỏ các tính năng chọn kỳ lọc không còn cần thiết. Bảng dữ liệu chi tiết thống kê đầy đủ 11 nguồn.
- **Chuẩn hóa Comment Code**: Cải thiện mức độ dễ đọc, tinh gọn các bình luận rườm rà.

---

## [3.0.0] — 2026-05-14

### 🏓 API Playground — Thay thế Swagger UI

- **Xóa `swagger-ui-express` & `swagger-jsdoc`** (35 packages) — giảm bundle và tăng tốc khởi động.
- **Triển khai `/playground`** — trang test API tùy chỉnh dành riêng cho VietFuel:
  - Sidebar endpoint (11 endpoints) phân nhóm: Tổng hợp / Nguồn đơn lẻ / Địa lý / Hệ thống.
  - Request builder với params dropdown (63 tỉnh/thành).
  - Live JSON response với syntax highlight (keys xanh, strings lục, numbers đỏ) + status badge + latency + size.
  - Code snippets: cURL / JavaScript / Python với nút copy.
- **Cập nhật nav/footer/hero**: Thay thế mọi tham chiếu “Swagger UI” → “API Playground”.
- **Dọn dẹp debug files**: Xóa `utils/swagger.js` và các file `tools/probe_*.js`, `tools/debug_*.js`.

---

## [Unreleased] — 2026-05-14

### 🚀 Loại bỏ hoàn toàn Playwright — Kiến trúc HTTP-only

Đây là thay đổi kiến trúc lớn nhất kể từ phiên bản 1.0: **toàn bộ hệ thống scraper hiện hoạt động 100% bằng HTTP thuần**, không còn bất kỳ phụ thuộc nào vào Playwright hay Chromium headless.

#### 🙏 Nguồn tham khảo kỹ thuật

Các phương pháp dưới đây được tham khảo và mở rộng từ hai nguồn cộng đồng xuất sắc:
- **Blog**: [_"Xây dựng Vietfuel API phiên bản ít RAM"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) — **toidicakhia** [@toidicakhia](https://github.com/toidicakhia)
- **Gist**: [`petro_price.sh`](https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264) — **@nguynkhn** (phát hiện Petrolimex REST API endpoint)

#### 🔄 Petrolimex — Tiếp cận mới qua REST API nội bộ

| Trước | Sau |
|---|---|
| Playwright → click popup → DOM extraction | **VIEApps CMS REST API** (JSON trực tiếp từ server) |

- **Tier 0** *(mới)*: `https://portals.petrolimex.com.vn/~apis/portals/cms.item/search?x-request=<base64>` — trả về JSON gồm `Zone1Price`, `Zone2Price`, `LastModified` chính xác 100%. Không cần auth.
- **Tier 1** *(fallback)*: GiaXangHomNay SSR parse
- **Tier 2** *(fallback)*: WebGia SSR parse

#### 🔄 Các scraper khác — HTTP-only

| Scraper | Thay đổi |
|---|---|
| **Mipec** | `node-fetch + cheerio` parse bảng SSR từ mipec.com.vn (bỏ Playwright) |
| **WebGia** | `node-fetch + cheerio`, sửa parser theo cấu trúc `<th>` đặc biệt của site |
| **GiaXangHomNay** | HTTP fetch (không thay đổi) |
| **PVOil** | Tầng 1+2 chuyển từ Playwright → `node-fetch + cheerio` |

#### 📦 Dependencies

- **Xóa**: `playwright` (giảm ~300MB+ Docker image)
- **Dockerfile**: Đổi từ `mcr.microsoft.com/playwright:v1.49.0-noble` (~2GB) → `node:22-alpine` (~50MB)

---

## [Unreleased] — 2026-05-04

### 🙏 Lời cảm ơn đặc biệt

Phiên bản này được cải thiện đáng kể nhờ bài blog xuất sắc **"Xây dựng Vietfuel API phiên bản ít RAM"** của tác giả **toidicakhia** ([@toidicakhia](https://github.com/toidicakhia)).

Qua bài viết, tác giả đã chỉ ra rằng Playwright — mặc dù mạnh mẽ — là quá tốn tài nguyên cho các nguồn dữ liệu không yêu cầu JavaScript rendering. Đồng thời tác giả chia sẻ kỹ thuật bypass Cloudflare của PVOil bằng cách truy cập IP origin kèm `Host` header — một giải pháp rất thông minh và nhẹ.

Chúng tôi xin phép sử dụng các ý tưởng kỹ thuật này để cải thiện project, và ghi credit đầy đủ trong source code. Mọi đóng góp và phản hồi từ cộng đồng đều là động lực lớn để tiếp tục phát triển dự án.

- Blog: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
- Demo của tác giả: https://fuelprice.toidicakhia.me

### 🔧 Cải thiện (Scraper tối ưu RAM)

Áp dụng chiến lược **"HTTP-first, browser-fallback"** cho các nguồn không yêu cầu JavaScript rendering, giúp giảm đáng kể mức tiêu thụ RAM (từ ~150-200MB/scraper xuống ~0MB khi HTTP thành công):

| Scraper | Thay đổi |
|---|---|
| **Comeco** | Tầng 1 mới: `node-fetch` + `cheerio` parse HTML tĩnh. Playwright giữ làm fallback. |
| **Petrotimes** | Tầng 1 mới: Gọi thẳng API nội bộ `/site/get-petro` không cần browser. |
| **SaigonPetro** | Tầng 1 mới: Fetch trang chính → trích xuất `data-list` → gọi API `/load-time` động. |
| **PVOil** | Tầng 0 mới: Bypass Cloudflare qua IP origin `103.21.120.100` với `Host: www.pvoil.com.vn`. |

### 📦 Dependencies
- Thêm `cheerio` và `node-fetch@2` vào `backend/package.json`.

---

## [Unreleased] — 2026-04-xx

### ⏰ Adaptive Cron Schedule (NĐ 80/2023/NĐ-CP)
- Thay thế lịch cào cố định mỗi 1 giờ bằng chế độ linh hoạt 3 mode theo cơ sở pháp lý:
  - **Checking** (T2–T4): 4 tiếng/lần — giá ổn định, tiết kiệm tài nguyên server.
  - **Hunting** (T5, 14:30–16:00): 15 phút/lần — khung giờ vàng Nhà nước công bố giá mới.
  - **Maintenance** (T6–CN): 6 tiếng/lần — giá đã chính thức, giảm tần suất để tiết kiệm băng thông.
- Bổ sung ghi chú pháp lý trong code: NĐ 80/2023, NĐ 95/2021, NĐ 83/2014.
- Thêm field `mode` vào log để monitor biết đang chạy chu kỳ nào.
- Công thức cron đầy đủ (được test): `30,45 14 * * 4` và `0,15,30,45 15 * * 4`.

### 📡 Endpoint mới: `GET /api/sources`
- Trả về danh sách toàn bộ 11 nguồn dữ liệu kèm trạng thái cache hiện tại.
- Field trả về: `id`, `label`, `url`, `populated`, `scrapedAt`, `ttlRemainingSeconds`, `isStale`.
- Phục vụ đối chiếu và kiểm tra tính minh bạch cho cộng đồng developer.

### 🔧 Tối ưu hóa Stealth toàn hệ thống
- Chuyển `USER_AGENTS` pool và hàm `pickRandomUA()`, `humanDelay()` vào `utils.js` — tất cả scraper gọi `createBrowser()` đều hưởng lợi tự động.
- Pool 5 UA phổ biến (thêm Linux/Chrome UA mới).
- Xoá code trùng lập trong `pvoil.js`.

### ⛽ Nâng cấp PVOIL — Chiến lược 3 Tầng Dự Phòng
- **Tầng 1 — Stealth Direct**: Cào trực tiếp `pvoil.com.vn` với kỹ thuật giả lập trình duyệt thực tế.
- **Tầng 2 — GXHN Fallback**: Cào văn bản qua `giaxanghomnay.com` — nguồn tổng hợp công khai.
- **Tầng 3 — Light HTTP Fetch**: Gọi HTTPS thuần không cần Playwright tới các trang tổng hợp HTML tĩnh.
- Bổ sung field `_tier` vào kết quả (1/2/3) cho phép monitor biết chính xác tầng nào đang phục vụ.

### 📁 Cập nhật cấu trúc tài liệu
- Cập nhật cây thư mục dự án trong README (VI/EN).
- Thêm thư mục `docs/assets/` chứa ảnh preview giao diện cho README.

### 📘 Chuẩn hóa tài liệu GitHub & Cộng đồng
- Bổ sung bộ file cộng đồng/pháp lý: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `DISCLAIMER.md`.
- Bổ sung tài liệu quy ước comment: `docs/comment-style.md`.
- Cập nhật README (VI/EN) theo repository `TranQui004/vietfuel-api`.

### ⚙️ Tái Cấu Trúc Backend
- **Tách dữ liệu cấu hình**: Đưa toàn bộ hằng số 63 tỉnh thành ra file tĩnh `backend/data/provinces.json`.
- **Phân tách Module Scraper**: Chuyển `scraper.js` thành 9 file modules con vào `backend/services/scrapers/`.
- **Tối ưu Load Tài Nguyên Khởi Động**: Thay thế khởi động đa trình duyệt song song (`Promise.all`) bằng thuật toán tuần tự — triệt tiêu RAM spikes của Playwright Chromium.
- **Sửa đường dẫn chuẩn**: Sử dụng `path.join(__dirname)` cho `cache.json` để tránh mất cache khi runtime directory thay đổi.
- **Nén Gzip/Brotli (`compression`)**: Giảm ~70% dung lượng phản hồi API.
- **Tiêu chuẩn bảo mật (`helmet`)**: Tự động thiết lập HTTP Security Headers đầy đủ.
- **Cấu hình PM2**: Bổ sung `ecosystem.config.js` cho vận hành production.
- **Cơ chế Stale Cache Thích ứng**: Tắt tự động xóa cache hết hạn — API không bao giờ bị 503.

### 🛠 Cập nhật đồng bộ tài liệu & hệ thống
- Hoàn thiện bộ kiểm thử backend cho toàn bộ scraper. Khởi chạy qua `npm run test`.
- Cập nhật README, changelog, và tài liệu kiến trúc (cả VI/EN).

---

## [1.0.0] — 2026-04-02

### ✨ Phát hành chính thức (Phiên Bản Đầu Tiên)
- **API Giá Xăng Dầu Đầy Đủ**: Cung cấp dữ liệu giá xăng dầu bán lẻ tại Việt Nam theo thời gian thực.
- **Default Endpoint (`/api/fuel-prices`)**: Tổng hợp dữ liệu chuẩn xác nhất từ 11 nguồn. Lấy Petrolimex làm gốc, tự động bù ngày từ nguồn khác khi cần.
- **11 Nguồn Dữ Liệu**: Petrolimex + 3 mirror Petrolimex, PVOil, Mipec, COMECO, Saigon Petro, Petro Times, WebGia, GiaXangHomNay.
- **63 Tỉnh Thành**: Hỗ trợ tra cứu giá on-demand theo từng tỉnh thành. Phân định chuẩn xác Vùng 1, Vùng 2 và 4 Tỉnh Bán phần.
- **Tài liệu API Toàn Diện**: API Reference, Playground tương tác, Live Data Dashboard.
- **Bảo Mật & Tối Ưu**: Rate Limiting (60/20 req/phút), In-memory Cache & Disk Fallback.

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
