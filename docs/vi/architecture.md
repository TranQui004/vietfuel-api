# Kiến trúc hệ thống — VietFuel API

## Tổng quan

VietFuel API là hệ thống thu thập và phân phối giá xăng dầu bán lẻ tại Việt Nam từ 11 nguồn phân phối chính thức. Hệ thống đã được chuyển đổi hoàn toàn sang kiến trúc **Serverless (Cloudflare Workers)** kết hợp **Hono**.
Toàn bộ scraper hoạt động bằng `fetch + cheerio`, **không sử dụng Headless Browser (Playwright)**. Việc này giúp loại bỏ hoàn toàn chi phí duy trì VPS (0đ), tăng tốc độ phản hồi (Edge Network), giảm mức tiêu thụ RAM xuống mức tối thiểu và chạy hoàn toàn trên Cloudflare V8 runtime.

---

## Scraper Service (`src/scrapers/`)

| Nguồn | Chiến lược chính | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | **Tier 0**: VIEApps CMS REST API (JSON, không cần auth) | Tier 1: GXHN HTTP → Tier 2: WebGia HTTP |
| KV2 / Saigon / VungTau Petrolimex | Đồng bộ mirror từ Petrolimex | — |
| **PVOil** | **Tier 0**: Bypass Cloudflare bằng Origin IP | Tier 1: HTTP direct → Tier 2: GXHN HTTP fallback |
| **Mipec** | HTTP fetch + cheerio parse bảng SSR mipec.com.vn | GXHN HTTP fallback |
| **COMECO** | HTTP fetch + cheerio parse HTML tĩnh | — |
| **Saigon Petro** | HTTP fetch → trích xuất `data-list` → gọi API `/load-time` động | — |
| **Petro Times** | HTTP fetch API nội bộ `/site/get-petro` | — |
| **WebGia** | HTTP fetch + cheerio parse cấu trúc `<th>` đặc biệt | — |
| **GiaXangHomNay** | HTTP fetch + cheerio parse bảng SSR | — |

> **Ghi công kỹ thuật**:
> - Kỹ thuật bypass Cloudflare PVOil và chiến lược HTTP-first tham khảo từ:
>   [_"Xây dựng Vietfuel API phiên bản ít RAM"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) — **toidicakhia**
> - Petrolimex REST API endpoint phát hiện bởi:
>   [`petro_price.sh` gist](https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264) — **@nguynkhn**

**Ngày niêm yết**: Tất cả `priceDate` được chuẩn hoá về **ISO 8601 (YYYY-MM-DD)**. Response bổ sung `priceDateDisplay` (DD/MM/YYYY) cho hiển thị UI.

---

## Cache Service (Cloudflare KV)

Toàn bộ hệ thống caching hiện tại được quản lý bởi **Cloudflare KV Namespace** (`FUEL_CACHE`), giúp đồng bộ hóa trạng thái toàn cầu với độ trễ siêu thấp.

| Loại Cache | Lưu trữ | TTL | Khởi tạo |
| :--- | :--- | :--- | :--- |
| Dữ liệu Quốc gia (`prices:source`) | Cloudflare KV | 0 (Không hết hạn) | Cron Trigger (Scheduled) hoặc On-demand |
| Dữ liệu Tỉnh (`province:slug`) | Cloudflare KV | Tùy chỉnh (3600s) | On-demand (Khi có request) |
| Metadata & Thống kê | Cloudflare KV | 0 (Không hết hạn) | Ghi kèm mỗi lần cập nhật |

**Stale Cache Fallback**: Hệ thống vô hiệu hoá tự động xóa TTL. Nếu Crawler gặp sự cố, API vẫn trả về dữ liệu cũ (Cache Hit) kèm cờ `isStale: true` để tránh sập hệ thống (503).

---

## Rate Limiting & Proxy

Do hoạt động trên Cloudflare Workers, hệ thống kế thừa toàn bộ các tính năng bảo mật của mạng lưới Cloudflare:
- **Rate Limit**: Quản lý bởi Cloudflare WAF.
- **Cache-Control headers**: Được tinh chỉnh để CDN Cloudflare phục vụ thẳng cho người dùng cuối mà không cần đánh thức Worker.
  - Nguồn quốc gia: `Cache-Control: public, max-age=3600, stale-while-revalidate=60`
  - Tỉnh (cache hit): `Cache-Control: public, max-age=<ttl_remaining>`
  - Danh sách tỉnh: `Cache-Control: public, max-age=86400` (dữ liệu tĩnh, 24h)

---

## Adaptive Cron (Wrangler Triggers)

Việc tự động cào dữ liệu được thực thi bởi **Cloudflare Cron Triggers** (`wrangler.toml`), được điều chỉnh theo Nghị định 80/2023/NĐ-CP:

| Chế độ | Thời gian (UTC) | Tần suất | Lý do |
| :--- | :--- | :--- | :--- |
| **Checking** | Thứ 2 – Thứ 4 | Mỗi 4 giờ | Giá ổn định, tiết kiệm tài nguyên |
| **Hunting** | Thứ 5, 07:30–09:00 (UTC) | Mỗi 15 phút | Khung giờ Nhà nước công bố giá mới (14:30 - 16:00 VN) |
| **Maintenance** | Thứ 6 – Chủ nhật | Mỗi 6 giờ | Giá đã chính thức, giảm tần suất |

---

## Mô hình chất lượng dữ liệu

- **Chuẩn hóa ngày**: `priceDate` luôn được normalize về `YYYY-MM-DD`.
- **Hiển thị thân thiện**: thêm `priceDateDisplay` dạng `DD/MM/YYYY` cho UI.
- **Cảnh báo stale**: khi dữ liệu quá tuổi TTL, response có `isStale: true`.
- **Cảnh báo bảo vệ nguồn**: với PVOil, khi bị chặn anti-bot sẽ có `blockedByProtection: true`.
- **Tier tracking**: field `_tier` trong kết quả scraper (0/1/2/3) cho monitor biết chính xác tầng nào đang phục vụ.

---

## Test API UI (`/test-api`)

Trang kiểm thử API chuyên biệt, thiết kế dành riêng cho VietFuel API:

| Tính năng | Mô tả |
| :--- | :--- |
| **Endpoint sidebar** | 11 endpoints phân nhóm: Tổng hợp / Nguồn đơn lẻ / Địa lý / Hệ thống |
| **Request builder** | URL bar tự động + params dropdown (63 tỉnh/thành) |
| **Live JSON viewer** | Syntax highlighting + status badge + latency + response size |
| **Code snippets** | Tự động tạo cURL / JavaScript / Python từ config hiện tại |
| **No dependencies** | Vanilla JS thuần — không framework, tải qua CDN Cloudflare cực nhanh |

> Truy cập tại: `/test-api`

---

## Nguyên tắc thiết kế (V2 Serverless)

| Nguyên tắc | Mô tả kỹ thuật |
| :--- | :--- |
| **Serverless Edge** | Chạy 100% trên Cloudflare Workers v8 Runtime, phản hồi nhanh mọi nơi. |
| **Zero-VPS** | Không chi phí máy chủ, không cần bảo trì PM2, OS hay thư viện Native (Playwright). |
| **Khả năng phục hồi** | Lỗi nguồn không làm sập API; dữ liệu cũ vẫn phục vụ với cờ cảnh báo qua KV Cache. |
| **Minh bạch metadata** | Trả về nguồn dữ liệu, thời điểm cào, TTL và trạng thái stale/protection/tier. |

---

## Phụ lục — Phân vùng giá (Region Classification)

| Phân loại | Số tỉnh | Ghi chú |
| :--- | :--- | :--- |
| Vùng 1 toàn tỉnh | 43 | Giá tiêu chuẩn |
| Vùng 2 toàn tỉnh | 15 | Tối đa +2% so với Vùng 1 |
| Bán phần (partial) | 4 (QN, BT, BR-VT, KG) | Một số huyện/đảo thuộc Vùng 2 |

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
