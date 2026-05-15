<p align="center">
  <img src="public/brand/VietFuelAPI_header.png" alt="VietFuelAPI Banner" width="800">
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

# Cài đặt dependencies
npm install

# Khởi chạy server local (Wrangler dev)
npm run dev
```

Server local mặc định tại: `http://localhost:8787`

Các trang giao diện:
- Trang chủ: `http://localhost:8787/`
- Live Data: `http://localhost:8787/live`
- Test API: `http://localhost:8787/test-api`

### 🚀 Triển Khai Production (Cloudflare Workers)

Dự án này sử dụng kiến trúc Serverless (Cloudflare Workers), giúp bạn không cần thuê VPS hay dùng PM2:

```bash
# Đăng nhập vào tài khoản Cloudflare của bạn (nếu chưa)
npx wrangler login

# Triển khai lên mạng lưới toàn cầu của Cloudflare
npx wrangler deploy
```

## 📡 Danh sách Endpoint

### Nhóm Quốc gia

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/fuel-prices` | **(Khuyên dùng)** Trả về dữ liệu gộp từ các nguồn chuẩn xác nhất |
| `GET` | `/api/fuel-prices/:source` | Nguồn cụ thể: `petrolimex`, `pvoil`, `mipec`, `comeco`, `saigonpetro`, `petrotimes`, `webgia`, `giaxanghomnay`, ... |

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
| `GET` | `/api/sources` | Danh sách 11 nguồn dữ liệu kèm trạng thái cache |

### Giao diện web

| URL | Mô tả |
| :--- | :--- |
| `/` | Trang chủ — tổng quan API |
| `/live` | Live Dashboard — xem giá thực tế 11 nguồn |
| `/endpoints` | API Reference — tài liệu đầy đủ |
| `/test-api` | **Test API** — test endpoint trực tiếp trên trình duyệt |

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

- **Backend (Serverless)**: Node.js v22+, Hono, Cloudflare Workers V8 runtime.
- **Scraping**: `fetch` + `cheerio` — **HTTP-only, hoàn toàn không cần Headless Browser (Playwright)**.
- **Cache**: Cloudflare KV (`FUEL_CACHE`).
- **Scheduler**: Cloudflare Cron Triggers — lịch thích ứng theo **Nghị định 80/2023/NĐ-CP**:
  - T2–T4: 4 tiếng/lần (Checking)
  - T5, 07:30–09:00 UTC: 15 phút/lần (Hunting — khung giờ điều chỉnh giá VN)
  - T6–CN: 6 tiếng/lần (Maintenance)
- **Frontend**: HTML/CSS/JS tĩnh — được phục vụ siêu tốc qua Cloudflare CDN, không cần framework.
- **API Testing**: Giao diện Test API chuyên dụng tại `/test-api`.

## 📁 Cấu trúc dự án

```text
├── src/
│   ├── index.js              # Entry point Hono + static serving & router
│   ├── config.js             # Cấu hình nguồn và KV
│   ├── scrapers/             # Thư mục chứa logic cào dữ liệu độc lập
│   │   ├── petrolimex.js     # Petrolimex (Tier 0 REST API)
│   │   ├── pvoil.js          # PVOil (Bypass CF)
│   │   ├── mipec.js          # Mipec
│   │   ├── comeco.js         # COMECO
│   │   ├── saigonpetro.js    # Saigon Petro
│   │   ├── petrotimes.js     # Petro Times
│   │   ├── webgia.js         # WebGia
│   │   └── giaxanghomnay.js  # GiaXangHomNay
│   ├── scraper.js            # Unified scraper entry point
│   └── utils/
│       ├── fuel-helpers.js   # Normalize data & province info
│       └── regions.json      # Mapping các vùng (Vùng 1, Vùng 2, partial)
├── public/                   # Frontend assets (HTML, CSS, JS, Images)
│   ├── index.html            # Trang chủ
│   ├── live.html             # Dashboard dữ liệu trực tiếp
│   ├── endpoints.html        # Tài liệu API Reference
│   ├── test-api.html         # Công cụ Test API trực quan
│   ├── css/                  # File giao diện
│   ├── js/                   # JS tương tác giao diện
│   └── brand/                # Logo & Banner
├── docs/                     # Tài liệu kỹ thuật đa ngôn ngữ (VI/EN)
├── wrangler.toml             # Cấu hình Cloudflare Workers & KV namespace
└── package.json              # Dependency management
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

- Toàn bộ mã nguồn `src/`, `public/`, `docs/`
- Các file markdown cộng đồng/pháp lý
- Cấu hình chạy production (`wrangler.toml`)

### Tài nguyên không nên push

- `node_modules/`, `.wrangler/`
- Các file log, debug.

## ⚖️ Giấy phép

Phân phối dưới giấy phép **MIT**. Xem `LICENSE` để biết thêm chi tiết.

---

<p align="center">
  <img src="public/brand/VietFuelAPI_footer.png" alt="VietFuelAPI Footer" width="120">
</p>

<p align="center">
  <strong>© 2026 TranQui - <a href="https://github.com/TranQui004">GitHub: TranQui004</a></strong><br>
  Built with ❤️ by Developers for Developers.
</p>
