# Kiến trúc hệ thống — VietFuel API

## Tổng quan

VietFuel API là hệ thống thu thập và phân phối giá xăng dầu bán lẻ tại Việt Nam từ 11 nguồn phân phối chính thức. Hệ thống áp dụng kiến trúc **HTTP-only** — toàn bộ scraper hoạt động bằng `node-fetch + cheerio`, **không sử dụng Playwright hay bất kỳ headless browser nào**. Giúp giảm mức tiêu thụ RAM từ ~200MB/scraper xuống ~0MB và Docker image từ ~2GB xuống ~50MB.

---

## Scraper Service (`backend/services/scraper.js`)

| Nguồn | Chiến lược chính | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | **Tier 0**: VIEApps CMS REST API `/~apis/portals/cms.item/search` (JSON, không cần auth) | Tier 1: GXHN HTTP → Tier 2: WebGia HTTP |
| KV2 / Saigon / VungTau Petrolimex | Đồng bộ mirror từ Petrolimex | — |
| **PVOil** | **Tier 0**: HTTP fetch IP origin `103.21.120.100` + header `Host` (bypass Cloudflare) | Tier 1: HTTP direct → Tier 2: GXHN HTTP fallback |
| **Mipec** | HTTP fetch + cheerio parse bảng SSR mipec.com.vn | GXHN HTTP fallback ngày |
| **COMECO** | HTTP fetch + cheerio parse HTML tĩnh | — |
| **Saigon Petro** | HTTP fetch → trích xuất `data-list` → gọi API `/load-time` động | — |
| **Petro Times** | HTTP fetch API nội bộ `/site/get-petro` | — |
| **WebGia** | HTTP fetch + cheerio parse cấu trúc `<th>` đặc biệt | — |
| **GiaXangHomNay** | HTTP fetch + cheerio parse bảng SSR | — |

> **Ghi công kỹ thuật**:
> - Kỹ thuật bypass Cloudflare PVOil qua IP origin và chiến lược HTTP-first tham khảo từ:
>   [_"Xây dựng Vietfuel API phiên bản ít RAM"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) — **toidicakhia**
> - Petrolimex REST API endpoint phát hiện bởi:
>   [`petro_price.sh` gist](https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264) — **@nguynkhn**

**Ngày niêm yết**: Tất cả `priceDate` được chuẩn hoá về **ISO 8601 (YYYY-MM-DD)**. Response bổ sung `priceDateDisplay` (DD/MM/YYYY) cho hiển thị UI.

---

## Cache Service (`backend/services/cache.js`)

| Cache | Loại | TTL | Khởi tạo |
| :--- | :--- | :--- | :--- |
| `memCache` (quốc gia) | In-memory (node-cache) | 0 (Không hết hạn) | Bootstrap + Cron |
| `provinceCache` | In-memory (node-cache) | 0 (Không hết hạn) | On-demand |
| Disk persistence | `cache.json` | Persist qua restart | Ghi sau mỗi lần cập nhật |

**Stale Cache Fallback**: Hệ thống vô hiệu hoá tự động xóa (`stdTTL = 0`). Nếu Crawler gặp sự cố, API vẫn trả về dữ liệu cũ kèm cờ `isStale: true`.

---

## Rate Limiting

- **Nguồn quốc gia**: 60 req/phút/IP
- **Endpoints tỉnh thành**: 20 req/phút/IP (scraping nặng hơn)

**HTTP Cache-Control headers**:
- Nguồn quốc gia: `Cache-Control: public, max-age=3600, stale-while-revalidate=60`
- Tỉnh (cache hit): `Cache-Control: public, max-age=<ttl_remaining>`
- Tỉnh (cache miss / lỗi): `Cache-Control: no-store`
- Danh sách tỉnh: `Cache-Control: public, max-age=86400` (dữ liệu tĩnh, 24h)

---

## Adaptive Cron (NĐ 80/2023/NĐ-CP)

| Chế độ | Thời gian | Tần suất | Lý do |
| :--- | :--- | :--- | :--- |
| **Checking** | Thứ 2 – Thứ 4 | Mỗi 4 giờ | Giá ổn định, tiết kiệm tài nguyên |
| **Hunting** | Thứ 5, 14:30–16:00 | Mỗi 15 phút | Khung giờ Nhà nước công bố giá mới |
| **Maintenance** | Thứ 6 – Chủ nhật | Mỗi 6 giờ | Giá đã chính thức, giảm tần suất |

---

## Mô hình chất lượng dữ liệu

- **Chuẩn hóa ngày**: `priceDate` luôn được normalize về `YYYY-MM-DD`.
- **Hiển thị thân thiện**: thêm `priceDateDisplay` dạng `DD/MM/YYYY` cho UI.
- **Cảnh báo stale**: khi dữ liệu quá tuổi TTL, response có `isStale: true`.
- **Cảnh báo bảo vệ nguồn**: với PVOil, khi bị chặn anti-bot sẽ có `blockedByProtection: true`.
- **Tier tracking**: field `_tier` trong kết quả scraper (0/1/2/3) cho monitor biết chính xác tầng nào đang phục vụ.

---

## API Playground (`/playground`)

Trang kiểm thử API tùy chỉnh, thay thế hoàn toàn Swagger UI:

| Tính năng | Mô tả |
| :--- | :--- |
| **Endpoint sidebar** | 11 endpoints phân nhóm: Tổng hợp / Nguồn đơn lẻ / Địa lý / Hệ thống |
| **Request builder** | URL bar tự động + params dropdown (63 tỉnh/thành) |
| **Live JSON viewer** | Syntax highlighting + status badge + latency + response size |
| **Code snippets** | Tự động tạo cURL / JavaScript / Python từ config hiện tại |
| **No dependencies** | Vanilla JS thuần — không framework, load cực nhanh |

> Truy cập tại: `http://localhost:3000/playground`

---

## Nguyên tắc thiết kế

| Nguyên tắc | Mô tả kỹ thuật |
| :--- | :--- |
| **HTTP-Only** | Toàn bộ scraper dùng HTTP fetch + cheerio — không có headless browser ở bất kỳ tầng nào. |
| **Cache-First** | Mỗi request ưu tiên phục vụ từ RAM; scraper chạy nền. |
| **Khả năng phục hồi** | Lỗi nguồn không làm sập API; dữ liệu cũ vẫn phục vụ với cờ cảnh báo. |
| **Không spam nguồn** | Lịch cào thích ứng theo từng giai đoạn điều hành giá. |
| **Minh bạch metadata** | Trả về nguồn dữ liệu, thời điểm cào, TTL và trạng thái stale/protection/tier. |
| **Thân thiện hạ tầng** | Header `Cache-Control` rõ ràng để CDN/proxy hoạt động hiệu quả. |

---

## Phụ lục — Phân vùng giá (Region Classification)

| Phân loại | Số tỉnh | Ghi chú |
| :--- | :--- | :--- |
| Vùng 1 toàn tỉnh | 43 | Giá tiêu chuẩn |
| Vùng 2 toàn tỉnh | 15 | Tối đa +2% so với Vùng 1 |
| Bán phần (partial) | 4 (QN, BT, BR-VT, KG) | Một số huyện/đảo thuộc Vùng 2 |

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
