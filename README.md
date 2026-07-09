<p align="center">
  <img src="public/brand/VietFuelAPI_header.png" alt="VietFuelAPI Banner" width="800">
</p>

<h1 align="center">VietFuelAPI</h1>

<p align="center">
  <strong>API giá xăng dầu Việt Nam thời gian thực — 11 Nguồn dữ liệu, 63 Tỉnh thành, Phân vùng 1 &amp; 2 chuẩn xác.</strong>
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
- [Sử dụng API](#-sử-dụng-api)
- [Danh sách Endpoint](#-danh-sách-endpoint)
- [Chạy Local (cho Developer)](#-chạy-local-cho-developer)
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

- 🚀 **Hiệu năng cực cao**: Dữ liệu phục vụ từ cache, độ trễ thấp.
- 🔄 **Cập nhật tự động**: Adaptive Cron thông minh bắt nhịp chính xác chu kỳ điều chỉnh giá của nhà nước.
- 🔗 **11 nguồn dữ liệu**: Tích hợp công nghệ Bot Stealth Fallback thông minh, vượt rào chống bot.
- 📊 **Giao diện trực quan**: Hai trang Dashboard được thiết kế bằng [ApexCharts](https://apexcharts.com/).
  - Bảng dữ liệu **Live** (`/`): Cập nhật tự động từng phút theo chế độ Dark/Light mode, hiển thị so sánh giá trên toàn quốc với hơn 63 tỉnh thành.
  - Bảng **Thống kê tổng quan** (`/history`): Biểu đồ cột ghép (Grouped Column) so sánh giá Vùng 1 và Vùng 2, kết hợp bảng dữ liệu thị trường có tính năng **Lọc (Filter)** theo nguồn và **Sắp xếp (Sort)** cột thông minh.
- 🖥️ **CLI Console Dashboard**: Tiện ích tương tác qua dòng lệnh (`npm run cli`) giúp quản trị viên tra cứu giá, xem lịch sử, kiểm tra sức khỏe hệ thống và dọn dẹp bộ nhớ đệm mà không cần trình duyệt.
- 🗺️ **63 Tỉnh thành**: Tra cứu giá theo từng tỉnh/thành, bao gồm thông tin Vùng 1/2.
- 🛡️ **Phân vùng chính xác**: Phân loại đúng 15 tỉnh Vùng 2 toàn tỉnh, 4 tỉnh bán phần (partial).
- 🔑 **Không cần Auth**: Mở cửa cho mọi nhà phát triển, hỗ trợ CORS đầy đủ.

## 🌐 Sử dụng API

API được host sẵn tại địa chỉ công khai. Bạn có thể gọi trực tiếp mà không cần cài đặt bất kỳ thứ gì:

```bash
# Lấy giá xăng dầu tổng hợp (tất cả nguồn)
curl https://vietfuel-api.tranqui.workers.dev/api/fuel-prices

# Lấy giá từ nguồn cụ thể
curl https://vietfuel-api.tranqui.workers.dev/api/fuel-prices/petrolimex

# Tra cứu giá theo tỉnh/thành
curl https://vietfuel-api.tranqui.workers.dev/api/fuel-prices/province/ha-noi
```

**Giao diện trực quan:**
- 🏠 Trang chủ: `https://vietfuel-api.tranqui.workers.dev/`
- 📊 Live Data: `https://vietfuel-api.tranqui.workers.dev/live`
- 📈 Thống kê & Lịch sử: `https://vietfuel-api.tranqui.workers.dev/history`
- 🔬 Test API: `https://vietfuel-api.tranqui.workers.dev/test-api`

## 📡 Danh sách Endpoint

### Nhóm Quốc gia

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/fuel-prices` | **(Khuyên dùng)** Trả về dữ liệu gộp từ tất cả 11 nguồn |
| `GET` | `/api/fuel-prices/:source` | Nguồn cụ thể: `petrolimex`, `kv2_petrolimex`, `saigon_petrolimex`, `vungtau_petrolimex`, `pvoil`, `mipec`, `comeco`, `saigonpetro`, `petrotimes`, `webgia`, `giaxanghomnay` |

### Tỉnh thành (on-demand)

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/provinces` | Danh sách 63 tỉnh thành với `id`, `slug`, `region` |
| `GET` | `/api/provinces?region=2` | Lọc chỉ tỉnh thuộc Vùng 2 |
| `GET` | `/api/fuel-prices/province/:slug` | Giá xăng dầu theo tỉnh (VD: `/api/fuel-prices/province/ha-noi`) |

### Hệ thống & Lịch sử

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Trạng thái sức khoẻ toàn bộ 11 nguồn dữ liệu |
| `GET` | `/api/sources` | Danh sách 11 nguồn dữ liệu kèm trạng thái cache |
| `GET` | `/api/history` | Lịch sử giá (hỗ trợ query `?limit=` và filter theo `/api/history/:fuel_name`) |

### Phản hồi mẫu

```json
{
  "success": true,
  "status": "ok",
  "meta": {
    "primarySource": "Petrolimex",
    "priceDate": "2026-05-15",
    "priceDateDisplay": "15/05/2026",
    "sourceCount": 11,
    "totalItems": 7
  },
  "data": [
    { "name": "Xăng RON 95-V", "region1": 24730, "region2": 25220, "unit": "VND/lít" },
    { "name": "Xăng RON 95-III", "region1": 24330, "region2": 24810, "unit": "VND/lít" }
  ]
}
```

## 💻 Chạy Local (cho Developer)

Để chạy thử nghiệm dự án hoặc phát triển tính năng mới tại local:

```bash
git clone https://github.com/TranQui004/vietfuel-api.git
cd petrolimex-fuel-api

# Cài đặt thư viện
npm install

# Khởi chạy server local (Wrangler dev)
npx wrangler dev
```

*Mở trình duyệt truy cập: `http://localhost:8787`*

### 🖥️ Khởi chạy Console Dashboard (CLI)
Sau khi khởi động server, bạn có thể khởi chạy giao diện tương tác CLI (không cần trình duyệt) bằng lệnh:
```bash
npm run cli
```

---

## 💻 Tự vận hành (Self-Hosted)

Dự án cung cấp mã nguồn mở hoàn toàn để bạn có thể tự vận hành (self-host) API của riêng mình nếu không muốn sử dụng public endpoint.

### Tuỳ chọn 1: Cloudflare Workers (Khuyên dùng)
Bạn có thể tự host API này trên Cloudflare Workers miễn phí (Free tier: 100,000 req/ngày):

1. **Tạo tài khoản Cloudflare** tại [cloudflare.com](https://cloudflare.com) (miễn phí)
2. **Tạo KV Namespace** trên Dashboard: Workers & Pages → KV → Create namespace đặt tên `FUEL_CACHE`
3. **Tạo D1 Database** (Tuỳ chọn cho lịch sử giá): Workers & Pages → D1 → Create database đặt tên `vietfuel-history`
4. **Sửa `wrangler.toml`**: Thay các ID tương ứng vừa tạo.
5. **Deploy**:

```bash
npx wrangler login
npx wrangler d1 execute vietfuel-history --file=./backend/src/db/schema.sql
npx wrangler deploy
```

### Tuỳ chọn 2: Docker (Optional / Advanced)
Nếu bạn có VPS riêng và không muốn phụ thuộc vào hệ sinh thái Cloudflare, bạn có thể chạy API qua Docker (sử dụng in-memory cache và SQLite thay thế).

```bash
git clone https://github.com/TranQui004/vietfuel-api.git
cd vietfuel-api

# Khởi chạy qua Docker Compose
docker-compose up -d
```
*Lưu ý: Chế độ Docker sử dụng node-server.js thay vì Cloudflare Workers environment. API Lịch sử giá sẽ được ghi vào file cục bộ.*

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

- **Runtime**: Cloudflare Workers (V8 isolates) + Hono framework.
- **Scraping**: `fetch` + `cheerio` — **HTTP-only, hoàn toàn không cần Headless Browser**.
- **Cache**: Cloudflare KV (`FUEL_CACHE`) — dữ liệu được phục vụ từ edge gần người dùng nhất.
- **Scheduler**: Cloudflare Cron Triggers — lịch thích ứng theo **Nghị định 80/2023/NĐ-CP**.
- **Frontend**: HTML/CSS/JS tĩnh — phục vụ qua Cloudflare CDN, không cần framework JS.

## 📁 Cấu trúc dự án

```text
├── backend/
│   └── src/
│       ├── index.js              # Entry point Hono + router
│       ├── scraper.js            # Unified scraper entry point
│       ├── cache.js              # Cloudflare KV helpers
│       ├── scrapers/             # Thư mục chứa logic cào dữ liệu độc lập
│       │   ├── petrolimex.js     # Petrolimex (REST API nội bộ)
│       │   ├── pvoil.js          # PVOil (Bypass Cloudflare)
│       │   ├── mipec.js          # Mipec
│       │   ├── comeco.js         # COMECO
│       │   ├── saigonpetro.js    # Saigon Petro
│       │   ├── petrotimes.js     # Petro Times
│       │   ├── webgia.js         # WebGia (mirror Petrolimex)
│       │   └── giaxanghomnay.js  # GiaXangHomNay (63 tỉnh)
│       ├── db/
│       │   ├── repository.js     # Lịch sử Giá (D1/SQLite)
│       │   └── schema.sql        # Cấu trúc bảng lịch sử
│       ├── data/
│       │   └── provinces.json    # Dataset 63 tỉnh thành (slug, region, districts)
│       └── utils/
│           └── fuel-helpers.js   # Normalize, sort, build response
├── public/                       # Frontend assets (HTML, CSS, JS, hình ảnh)
│   ├── index.html                # Trang chủ
│   ├── live.html                 # Dashboard dữ liệu trực tiếp
│   ├── history.html              # Dashboard Thống kê & Lịch sử
│   ├── endpoints.html            # Tài liệu API Reference
│   ├── test-api.html             # Công cụ Test API trực quan
│   ├── css/                      # Stylesheet
│   ├── js/                       # JS tương tác giao diện (bao gồm history.js)
│   └── brand/                    # Logo & Banner
├── docs/                         # Tài liệu kỹ thuật đa ngôn ngữ (VI/EN)
├── wrangler.toml                 # Cấu hình Cloudflare Workers (template)
└── package.json
```

## 📚 Tài liệu chi tiết

- [Kiến trúc hệ thống](docs/vi/architecture.md)
- [Lịch sử cập nhật](CHANGELOG.md)
- [Quy ước comment code](docs/vi/guides/comment-style.md)

## 🤝 Pháp lý & Cộng đồng

- [Hướng dẫn đóng góp (CONTRIBUTING.md)](CONTRIBUTING.md)
- [Quy tắc ứng xử](docs/vi/community/code-of-conduct.md)
- [Chính sách bảo mật](docs/vi/community/security.md)
- [Hỗ trợ](docs/vi/community/support.md)

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
