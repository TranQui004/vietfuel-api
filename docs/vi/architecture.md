# Kiến trúc hệ thống — VietFuel API

## Tổng quan

VietFuel API là hệ thống thu thập và phân phối giá xăng dầu bán lẻ tại Việt Nam từ 11 nguồn phân phối chính thức. Hệ thống áp dụng chiến lược **"HTTP-first, browser-fallback"** để tối ưu RAM và độ ổn định: ưu tiên thu thập qua HTTP thuần, chỉ dùng Playwright headless browser khi thực sự cần thiết.

---

## Scraper Service (`backend/services/scraper.js`)

| Nguồn | Chiến lược chính | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | Playwright (popup click) | Retry x4 |
| KV2 / Saigon / VungTau Petrolimex | Đồng bộ mirror từ Petrolimex | — |
| **PVOil** | **Tầng 0**: HTTP fetch IP origin `103.21.120.100` + header `Host` (bypass Cloudflare) | Tầng 1: Playwright stealth → Tầng 2: GiaXangHomNay |
| **Mipec** | Playwright + fallback bài viết tin tức | GiaXangHomNay |
| **COMECO** | **Tầng 1**: HTTP fetch + cheerio parse HTML tĩnh | Playwright |
| **Saigon Petro** | **Tầng 1**: HTTP fetch → trích xuất `data-list` → gọi API `/load-time` động | Playwright |
| **Petro Times** | **Tầng 1**: HTTP fetch trực tiếp API nội bộ `/site/get-petro` | Playwright |
| WebGia | HTTP Fetch / Playwright | — |
| GiaXangHomNay | Playwright | — |

> **Ghi công kỹ thuật**: Kỹ thuật bypass Cloudflare PVOil qua IP origin và chiến lược HTTP-first cho COMECO, SaigonPetro, Petrotimes được tham khảo từ bài blog
> [_"Xây dựng Vietfuel API phiên bản ít RAM"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) của tác giả **toidicakhia**.

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

## Nguyên tắc thiết kế

| Nguyên tắc | Mô tả kỹ thuật |
| :--- | :--- |
| **HTTP-First** | Ưu tiên HTTP fetch nhẹ trước, Playwright chỉ là lớp fallback cuối. |
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
