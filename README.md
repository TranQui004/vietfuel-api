<p align="center">
  <img src="frontend/brand/VietFuelAPI_header.png" alt="VietFuelAPI Banner" width="800">
</p>

<h1 align="center">VietFuelAPI</h1>

<p align="center">
  <strong>API giá xăng dầu Việt Nam thời gian thực — 11 Nguồn dữ liệu, 63 Tỉnh thành, Phân vùng 1 & 2 chuẩn xác.</strong>
</p>

<p align="center">
  <a href="https://github.com/TranQui004/vietfuel-api/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/TranQui004/vietfuel-api?style=for-the-badge&color=f59e0b" alt="License">
  </a>
  <img src="https://img.shields.io/badge/Refresh-Adaptive%20Cron-blue?style=for-the-badge&logo=clockify" alt="Refresh Cycle">
  <img src="https://img.shields.io/badge/Sources-11%20Providers-orange?style=for-the-badge&logo=databricks" alt="Data Sources">
  <img src="https://img.shields.io/badge/Provinces-63%20Tỉnh%20Thành-green?style=for-the-badge" alt="63 Provinces">
  <img src="https://img.shields.io/badge/PRs-welcome-ef4444?style=for-the-badge" alt="PRs Welcome">
</p>


<p align="center">
  <img src="docs/assets/mockup_readme_vi.png" alt="VietFuelAPI Mockup Vietnamese" width="900">
</p>

---

English version: [README.en.md](README.en.md)

---

## 📖 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Bắt đầu nhanh](#-bắt-đầu-nhanh)
- [Danh sách Endpoint](#-danh-sách-endpoint)
- [Phân vùng giá xăng dầu](#-phân-vùng-giá-xăng-dầu)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Tài liệu chi tiết](#-tài-liệu-chi-tiết)
- [Pháp lý & Cộng đồng](#-pháp-lý--cộng-đồng)
- [Giấy phép](#-giấy-phép)

---

## 👋 Giới thiệu

**VietFuelAPI** là dịch vụ API chuyên cung cấp dữ liệu giá xăng dầu bán lẻ tại Việt Nam theo định dạng JSON. Dữ liệu được tổng hợp từ **11 nguồn uy tín** (bao gồm Petrolimex và các mirror Petrolimex, PVOil, Mipec, COMECO, Saigon Petro, PetroTimes, WebGia, GiaXangHomNay) và cập nhật tự động theo **lịch điều hành (Nghị định 80/2023)**.

Hệ thống hỗ trợ tra cứu giá theo **63 tỉnh thành** với phân biệt rõ ràng **Vùng 1** (giá chuẩn) và **Vùng 2** (giá cao hơn tối đa 2%) theo đúng quy định hiện hành.

> [!IMPORTANT]
> Dự án này là dự án cộng đồng phục vụ học tập và nghiên cứu kỹ thuật, không đại diện cho bất kỳ tổ chức, doanh nghiệp hoặc cơ quan nhà nước nào.

## ✨ Tính năng nổi bật

- 🚀 **Hiệu năng cực cao**: Dữ liệu phục vụ từ RAM (In-memory cache), độ trễ < 10ms.
- 🔄 **Cập nhật tự động**: Adaptive Cron thông minh bắt nhịp chính xác chu kỳ điều chỉnh giá của nhà nước.
- 🔗 **11 nguồn dữ liệu**: Tích hợp công nghệ Bot Stealth Fallback thông minh, vượt rào chống bot.
- 🗺️ **63 Tỉnh thành**: Tra cứu giá theo từng tỉnh/thành, bao gồm thông tin Vùng 1/2.
- 🛡️ **Phân vùng chính xác**: Phân loại đúng 15 tỉnh Vùng 2 toàn tỉnh, 4 tỉnh bán phần (partial).

- 🔒 **Rate Limiting**: Bảo vệ API khỏi lạm dụng (60 req/phút cho source quốc gia, 20 req/phút cho tỉnh thành).
- 🌍 **Cache-Control chuẩn HTTP**: Hỗ trợ CDN caching, giúp người dùng cuối nhận data siêu nhanh.
- 🔑 **Không cần Auth**: Mở cửa cho mọi nhà phát triển, hỗ trợ CORS đầy đủ.

## 🚀 Bắt đầu nhanh

```bash
# Clone repository
git clone https://github.com/TranQui004/vietfuel-api.git
cd vietfuel-api

# Cài đặt dependencies backend
cd backend
npm install

# Cài đặt Playwright browsers (cần cho scraping)
npx playwright install chromium

# Khởi chạy server (development)
npm run dev
```

Server mặc định tại: `http://localhost:3000`

Giao diện web được phục vụ cùng cổng backend:
- Trang chủ: `http://localhost:3000/`
- Live Data: `http://localhost:3000/live`

Nếu chạy từ thư mục gốc project:

```bash
npm --prefix backend run dev
```

### 🚀 Triển Khai Production (PM2)

Dự án đã bao gồm file `ecosystem.config.js` để triển khai với [PM2](https://pm2.keymetrics.io/) – tiêu chuẩn vận hành Node.js trên Server thật:

```bash
# Cài PM2 toàn cục (nếu chưa có)
npm install -g pm2

# Khởi động với PM2
pm2 start ecosystem.config.js --env production

# Quản lý tiến trình
pm2 status
pm2 logs vietfuel-api
pm2 restart vietfuel-api
```

## 📡 Danh sách Endpoint

### Nhóm Quốc gia

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/fuel-prices` | **(Khuyên dùng)** Trả về dữ liệu gộp từ các nguồn chuẩn xác nhất (Mặc định) |
| `GET` | `/api/fuel-prices/:source` | Nguồn cụ thể theo `id` (ví dụ: `petrolimex`, `pvoil`, `mipec`, `comeco`, `saigonpetro`, `petrotimes`, ...). Danh sách đầy đủ có trong `availableSources` khi gọi sai source |

### Tỉnh thành (on-demand)

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/provinces` | Danh sách 63 tỉnh thành với `id`, `slug`, `region` |
| `GET` | `/api/provinces?region=2` | Lọc chỉ tỉnh thuộc Vùng 2 |
| `GET` | `/api/fuel-prices/province/:slug` | Giá xăng dầu theo tỉnh (VD: `/api/fuel-prices/province/ha-noi`) |

### Hệ thống

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Trạng thái sức khoẻ toàn bộ 11 nguồn dữ liệu |
| `GET` | `/api/sources` | Danh sách 11 nguồn dữ liệu kèm trạng thái cache (minh bạch cho developer) |

## 🗺️ Phân vùng giá xăng dầu

Theo quy định, giá xăng dầu tại Việt Nam được phân thành 2 vùng:

| Vùng | Mô tả | Số tỉnh |
| :--- | :--- | :--- |
| **Vùng 1** | Địa bàn gần kho đầu mối, hạ tầng thuận lợi. Giá tiêu chuẩn. | 43 tỉnh (toàn tỉnh) |
| **Vùng 2** | Địa bàn xa cảng, xa kho đầu mối, vùng sâu, vùng xa. **Giá cao hơn tối đa 2%.** | 15 tỉnh (toàn tỉnh) + 4 tỉnh bán phần |

**15 tỉnh thuần Vùng 2:** Hà Giang, Cao Bằng, Bắc Kạn, Tuyên Quang, Lào Cai, Điện Biên, Lai Châu, Sơn La, Yên Bái, Lạng Sơn, Kon Tum, Gia Lai, Đắk Lắk, Đắk Nông, Lâm Đồng.

**4 tỉnh bán phần** (một số huyện thuộc Vùng 2):

| Tỉnh | Huyện Vùng 2 |
| :--- | :--- |
| Quảng Ninh | Vân Đồn, Cô Tô, Hải Hà |
| Bình Thuận | Phú Quý |
| Bà Rịa - Vũng Tàu | Côn Đảo |
| Kiên Giang | Phú Quốc, Kiên Hải |

> API trả về thêm field `partialRegion: true` và `vung2Districts` cho 4 tỉnh này.

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js, Express, express-rate-limit.
- **Scraping**: Playwright (Chromium headless).
- **Cache**: node-cache (In-memory) + disk persistence (cache.json).
- **Scheduler**: node-cron — lịch thích ứng 3 chế độ theo **Nghị định 80/2023/NĐ-CP**:
  - T2–T4: 4 tiếng/lần (Checking)
  - T5, 14:30–16:00: 15 phút/lần (Hunting — khung giờ điều chỉnh giá)
  - T6–CN: 6 tiếng/lần (Maintenance)
- **Frontend**: Giao diện EJS và Static CSS/JS được serve trực tiếp bởi Express.
- **Logging**: Winston.

## 📁 Cấu trúc dự án

```text
├── backend/
│   ├── index.js              # Entry point Express + WebSocket + static serving
│   ├── config/
│   │   └── index.js          # Cấu hình chung (port, URLs, cron, cache TTL)
│   ├── data/
│   │   └── provinces.json    # Từ điển 63 tỉnh thành (slug, region, districts)
│   ├── routes/
│   │   └── fuel.js           # Toàn bộ REST API endpoints
│   ├── services/
│   │   ├── scrapers/         # Mỗi file là một engine độc lập (Plug & Play)
│   │   │   ├── utils.js          # Hàm core dùng chung (parse, cache, browser)
│   │   │   ├── petrolimex.js     # Petrolimex (nguồn chính)
│   │   │   ├── pvoil.js          # PVOil — chiến lược 3 tầng dự phòng
│   │   │   ├── pvoil-parser.js   # Parser riêng cho PVOil
│   │   │   ├── mipec.js          # Mipec
│   │   │   ├── comeco.js         # COMECO
│   │   │   ├── saigonpetro.js    # Saigon Petro
│   │   │   ├── petrotimes.js     # Petro Times
│   │   │   ├── webgia.js         # WebGia
│   │   │   └── giaxanghomnay.js  # GiaXangHomNay
│   │   ├── scraper.js        # Index tổng hợp — xuất tất cả scraper functions
│   │   └── cache.js          # In-memory cache (node-cache) + disk fallback
│   ├── workers/
│   │   └── jobs.js           # Cron scheduler — chạy scrape mỗi 1 giờ
│   ├── tools/
│   │   └── debug/            # Script debug cục bộ (ngoài runtime chính)
│   ├── utils/
│   │   ├── logger.js         # Winston logger
│   │   ├── websocket.js      # WebSocket server (push dữ liệu realtime)
│   │   └── fuel-helpers.js   # Helper tổng hợp: merge, normalize, sort
│   ├── tests/
│   │   ├── scrapers/         # Smoke tests cho từng scraper (8 file)
│   │   ├── api/              # API integration tests
│   │   ├── cache/            # Cache behavior tests
│   │   ├── run-all.js        # Chạy toàn bộ test suite
│   │   └── run-api.js        # Chạy riêng API tests
│   └── cache.json            # Fallback cache file (disk persistence)
├── frontend/
│   ├── views/                # EJS templates (serve bởi Express)
│   │   ├── index.ejs         # Landing page (trang chủ)
│   │   ├── live.ejs          # Live Data Dashboard
│   │   ├── endpoints.ejs     # API Reference + Demo Terminal
│   │   ├── disclaimer.ejs    # Tuyên bố miễn trừ
│   │   ├── privacy.ejs       # Chính sách bảo mật
│   │   ├── terms.ejs         # Điều khoản sử dụng
│   │   └── partials/         # Header, Footer, Icon components
│   ├── css/style.css         # Toàn bộ global CSS
│   ├── brand/                # Logo, banner, branding assets
│   └── js/                   # Frontend JS (lang, ui, live, playground...)
├── docs/
│   ├── assets/               # Ảnh preview cho README
│   ├── vi/                   # Tài liệu tiếng Việt
│   │   ├── architecture.md   # Kiến trúc hệ thống
│   │   ├── changelog.md      # Lịch sử thay đổi
│   │   ├── community/        # Đóng góp, quy tắc, bảo mật, hỗ trợ
│   │   ├── legal/            # Pháp lý (disclaimer, privacy, terms)
│   │   └── guides/           # Quy ước comment, hướng dẫn nội bộ
│   └── en/                   # Tài liệu tiếng Anh (song song)
└── ecosystem.config.js       # Cấu hình PM2 cho production
```

## 📚 Tài liệu chi tiết

- [Kiến trúc hệ thống](docs/vi/architecture.md)
- [Lịch sử cập nhật](docs/vi/changelog.md)
- [Quy ước comment](docs/vi/guides/comment-style.md)
- [Xem tài liệu API trực tuyến](http://localhost:3000)

## 🤝 Pháp lý & Cộng đồng

- [Chỉ mục pháp lý](docs/vi/legal/README.md)
- [Hướng dẫn đóng góp (CONTRIBUTING.md)](CONTRIBUTING.md)
- [Quy tắc ứng xử](docs/vi/community/code-of-conduct.md)
- [Chính sách bảo mật](docs/vi/community/security.md)
- [Hỗ trợ](docs/vi/community/support.md)

### Tài nguyên nên push lên GitHub

- Toàn bộ mã nguồn `backend/`, `frontend/`, `docs/`
- Các file markdown cộng đồng/pháp lý
- Cấu hình chạy production (`ecosystem.config.js`)

### Tài nguyên không nên push

- `node_modules/`, `logs/`, file dump debug, cache runtime
- Mọi file chứa credential hoặc thông tin nhạy cảm (`.env`)

## ⚖️ Giấy phép

Phân phối dưới giấy phép **MIT**. Xem `LICENSE` để biết thêm chi tiết.

---

<p align="center">
  <img src="frontend/brand/VietFuelAPI_footer.png" alt="VietFuelAPI Footer" width="120">
</p>

<p align="center">
  <strong>© 2026 TranQui - <a href="https://github.com/TranQui004">GitHub: TranQui004</a></strong><br>
  Built with ❤️ by Developers for Developers.
</p>
