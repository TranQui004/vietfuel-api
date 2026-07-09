import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const vi = `# Kiến trúc hệ thống — VietFuel API

## Tổng quan

VietFuel API là hệ thống thu thập và phân phối giá xăng dầu bán lẻ tại Việt Nam từ 11 nguồn phân phối chính thức. Hệ thống áp dụng chiến lược **"HTTP-first, browser-fallback"** để tối ưu RAM và độ ổn định: ưu tiên thu thập qua HTTP thuần, chỉ dùng Playwright headless browser khi thực sự cần thiết.

---

## Scraper Service (\`backend/services/scraper.js\`)

| Nguồn | Chiến lược chính | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | Playwright (popup click) | Retry x4 |
| KV2 / Saigon / VungTau Petrolimex | Đồng bộ mirror từ Petrolimex | — |
| **PVOil** | **Tầng 0**: HTTP fetch IP origin \`103.21.120.100\` + header \`Host\` (bypass Cloudflare qua HTTPS client bỏ qua xác thực SSL) | Tầng 1: Playwright stealth → Tầng 2: GiaXangHomNay |
| **Mipec** | Playwright + fallback bài viết tin tức | GiaXangHomNay |
| **COMECO** | **Tầng 1**: HTTP fetch + cheerio parse HTML tĩnh | Playwright |
| **Saigon Petro** | **Tầng 1**: HTTP fetch → trích xuất \`data-list\` → gọi API \`/load-time\` động | Playwright |
| **Petro Times** | **Tầng 1**: HTTP fetch trực tiếp API nội bộ \`/site/get-petro\` | Playwright |
| WebGia | HTTP Fetch / Playwright | — |
| GiaXangHomNay | Playwright | — |

> **Ghi công kỹ thuật**: Kỹ thuật bypass Cloudflare PVOil qua IP origin và chiến lược HTTP-first cho COMECO, SaigonPetro, Petrotimes được tham khảo từ bài blog
> [_"Xây dựng Vietfuel API phiên bản ít RAM"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) của tác giả **toidicakhia**.

**Ngày niêm yết**: Tất cả \`priceDate\` được chuẩn hoá về **ISO 8601 (YYYY-MM-DD)**. Response bổ sung \`priceDateDisplay\` (DD/MM/YYYY) cho hiển thị UI.

---

## Cache Service (\`backend/services/cache.js\`)

| Cache | Loại | TTL | Khởi tạo |
| :--- | :--- | :--- | :--- |
| \`memCache\` (quốc gia) | In-memory (node-cache) | 0 (Không hết hạn) | Bootstrap + Cron |
| \`provinceCache\` | In-memory (node-cache) | 0 (Không hết hạn) | On-demand |
| Disk persistence | \`cache.json\` | Persist qua restart | Ghi sau mỗi lần cập nhật |

**Stale Cache Fallback**: Hệ thống vô hiệu hoá tự động xóa (\`stdTTL = 0\`). Nếu Crawler gặp sự cố, API vẫn trả về dữ liệu cũ kèm cờ \`isStale: true\`.

---

## Dịch vụ Cơ sở dữ liệu (\`backend/src/db/repository.js\`)

Lưu trữ lịch sử tất cả các kỳ điều hành giá xăng dầu:
- **Hệ thống lưu trữ**: Sử dụng Cloudflare D1 trên môi trường serverless và SQLite (\`better-sqlite3\`) cục bộ khi chạy Node.js server.
- **Tương thích câu lệnh**: Sử dụng chuẩn cú pháp \`?\` tham số của SQLite tương thích giữa Cloudflare D1 và driver \`better-sqlite3\`.
- **Tự động dọn dẹp (Auto-Pruning)**: Tự động chạy cơ chế dọn dẹp các bản ghi lịch sử có tuổi đời lớn hơn 90 ngày sau khi cào và chèn dữ liệu mới thành công.

---

## CLI Console Dashboard (\`backend/src/cli.js\`)

Giao diện tương tác trực tiếp qua terminal cho người vận hành (không cần trình duyệt):
- **Khởi chạy**: Bằng lệnh \`npm run cli\`.
- **Giao diện trực quan**: Định dạng màu sắc ANSI và bảng ASCII so sánh giá 11 nhà phân phối dạng ngang gọn gàng.
- **Tính năng đầy đủ**: Xem giá trực tiếp, tra cứu lịch sử lọc theo tên sản phẩm, kiểm tra trạng thái crawlers / đường dẫn lưu trữ cơ sở dữ liệu, xóa cache và kích hoạt cào lực lượng (force refresh).

---

## Rate Limiting

- **Nguồn quốc gia**: 60 req/phút/IP
- **Endpoints tỉnh thành**: 20 req/phút/IP (scraping nặng hơn)

**HTTP Cache-Control headers**:
- Nguồn quốc gia: \`Cache-Control: public, max-age=3600, stale-while-revalidate=60\`
- Tỉnh (cache hit): \`Cache-Control: public, max-age=<ttl_remaining>\`
- Tỉnh (cache miss / lỗi): \`Cache-Control: no-store\`
- Danh sách tỉnh: \`Cache-Control: public, max-age=86400\` (dữ liệu tĩnh, 24h)

---

## Adaptive Cron (NĐ 80/2023/NĐ-CP)

| Chế độ | Thời gian | Tần suất | Lý do |
| :--- | :--- | :--- | :--- |
| **Checking** | Thứ 2 – Thứ 4 | Mỗi 4 giờ | Giá ổn định, tiết kiệm tài nguyên |
| **Hunting** | Thứ 5, 14:30–16:00 | Mỗi 15 phút | Khung giờ Nhà nước công bố giá mới |
| **Maintenance** | Thứ 6 – Chủ nhật | Mỗi 6 giờ | Giá đã chính thức, giảm tần suất |

---

## Mô hình chất lượng dữ liệu

- **Chuẩn hóa ngày**: \`priceDate\` luôn được normalize về \`YYYY-MM-DD\`.
- **Hiển thị thân thiện**: thêm \`priceDateDisplay\` dạng \`DD/MM/YYYY\` cho UI.
- **Cảnh báo stale**: khi dữ liệu quá tuổi TTL, response có \`isStale: true\`.
- **Cảnh báo bảo vệ nguồn**: với PVOil, khi bị chặn anti-bot sẽ có \`blockedByProtection: true\`.
- **Tier tracking**: field \`_tier\` trong kết quả scraper (0/1/2/3) cho monitor biết chính xác tầng nào đang phục vụ.

---

## Nguyên tắc thiết kế

| Nguyên tắc | Mô tả kỹ thuật |
| :--- | :--- |
| **HTTP-First** | Ưu tiên HTTP fetch nhẹ trước, Playwright chỉ là lớp fallback cuối. |
| **Cache-First** | Mỗi request ưu tiên phục vụ từ RAM; scraper chạy nền. |
| **Khả năng phục hồi** | Lỗi nguồn không làm sập API; dữ liệu cũ vẫn phục vụ với cờ cảnh báo. |
| **Không spam nguồn** | Lịch cào thích ứng theo từng giai đoạn điều hành giá. |
| **Minh bạch metadata** | Trả về nguồn dữ liệu, thời điểm cào, TTL và trạng thái stale/protection/tier. |
| **Thân thiện hạ tầng** | Header \`Cache-Control\` rõ ràng để CDN/proxy hoạt động hiệu quả. |

---

## Phụ lục — Phân vùng giá (Region Classification)

| Phân loại | Số tỉnh | Ghi chú |
| :--- | :--- | :--- |
| Vùng 1 toàn tỉnh | 43 | Giá tiêu chuẩn |
| Vùng 2 toàn tỉnh | 15 | Tối đa +2% so với Vùng 1 |
| Bán phần (partial) | 4 (QN, BT, BR-VT, KG) | Một số huyện/đảo thuộc Vùng 2 |

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
`;

const en = `# System Architecture — VietFuel API

## Overview

VietFuel API aggregates real-time fuel prices in Vietnam from 11 official distributors. It applies an **"HTTP-first, browser-fallback"** strategy: lightweight HTTP fetch is always tried first, Playwright headless browser is only used as a last resort, significantly reducing RAM usage.

---

## Scraper Service (\`backend/services/scraper.js\`)

| Source | Primary Strategy | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | Playwright (popup click) | Retry x4 |
| KV2 / Saigon / VungTau Petrolimex | Mirror sync from Petrolimex | — |
| **PVOil** | **Tier 0**: HTTP fetch origin IP \`103.21.120.100\` + \`Host\` header (Cloudflare bypass via HTTPS client with disabled SSL verification) | Tier 1: Playwright stealth → Tier 2: GiaXangHomNay text |
| **Mipec** | Playwright + news article fallback | GiaXangHomNay |
| **COMECO** | **Tier 1**: HTTP fetch + cheerio static HTML parse | Playwright |
| **Saigon Petro** | **Tier 1**: HTTP fetch → extract \`data-list\` → call dynamic \`/load-time\` API | Playwright |
| **Petro Times** | **Tier 1**: HTTP fetch directly to internal API \`/site/get-petro\` | Playwright |
| WebGia | HTTP Fetch / Playwright | — |
| GiaXangHomNay | Playwright | — |

> **Technique credit**: The PVOil Cloudflare bypass via origin IP and the HTTP-first strategy for COMECO, SaigonPetro, and Petrotimes were inspired by the blog post
> [_"Building a Low-RAM Vietfuel API"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) by **toidicakhia**.

**Price Date**: All \`priceDate\` values are normalized to **ISO 8601 (YYYY-MM-DD)**. The response also includes \`priceDateDisplay\` (DD/MM/YYYY) for UI rendering.

---

## Cache Service (\`backend/services/cache.js\`)

| Cache | Type | TTL | Populated |
| :--- | :--- | :--- | :--- |
| \`memCache\` (national) | In-memory (node-cache) | 0 (Never expires) | Bootstrap + Cron |
| \`provinceCache\` | In-memory (node-cache) | 0 (Never expires) | On-demand |
| Disk persistence | \`cache.json\` | Survives restarts | Written after every update |

**Stale Cache Fallback**: Auto-deletion is disabled (\`stdTTL = 0\`). If the crawler fails, the API returns stale data with \`isStale: true\` instead of a 503 error.

---

## Database Service (\`backend/src/db/repository.js\`)

Stores historical fuel price adjustments:
- **Storage Engine**: Utilizes Cloudflare D1 in serverless production, and local SQLite (\`better-sqlite3\`) for local Node.js server runs.
- **Parameter Compatibility**: Standardized SQL statements using standard \`?\` positional parameters to ensure cross-platform compatibility between D1 and \`better-sqlite3\`.
- **Auto-Pruning**: Automatically prunes historical records older than 90 days after every successful scraping insert operation.

---

## CLI Console Dashboard (\`backend/src/cli.js\`)

An interactive terminal user interface (TUI) for administrators without web browser access:
- **Execution**: Run with command \`npm run cli\`.
- **Rich Visualization**: Fully formatted using ANSI colors and a clean horizontal ASCII table comparing pricing from all 11 providers.
- **Operator Menu**: Inspect live prices, search price history logs, check health status (including storage file paths), clear cache namespace, and trigger force refresh scrapes.

---

## Rate Limiting

- **National sources**: 60 req/min/IP
- **Province endpoints**: 20 req/min/IP (heavier scraping)

**HTTP Cache-Control headers**:
- National: \`Cache-Control: public, max-age=3600, stale-while-revalidate=60\`
- Province (cache hit): \`Cache-Control: public, max-age=<ttl_remaining>\`
- Province (cache miss / error): \`Cache-Control: no-store\`
- Province list: \`Cache-Control: public, max-age=86400\` (static, 24h)

---

## Adaptive Cron (Decree 80/2023/ND-CP)

| Mode | Schedule | Frequency | Reason |
| :--- | :--- | :--- | :--- |
| **Checking** | Mon – Wed | Every 4 hours | Prices stable, conserve resources |
| **Hunting** | Thu 14:30–16:00 | Every 15 minutes | MOIT price announcement window |
| **Maintenance** | Fri – Sun | Every 6 hours | Prices settled, reduce bandwidth |

---

## Data Quality Model

- **Date normalization**: \`priceDate\` is always \`YYYY-MM-DD\`.
- **UI-friendly display**: \`priceDateDisplay\` field in \`DD/MM/YYYY\` format.
- **Stale warning**: \`isStale: true\` when data exceeds TTL.
- **Protection warning**: \`blockedByProtection: true\` when PVOil blocks direct access.
- **Tier tracking**: \`_tier\` field (0/1/2/3) in scraper result for monitoring.

---

## Design Principles

| Principle | Description |
| :--- | :--- |
| **HTTP-First** | Lightweight HTTP fetch before Playwright. Playwright is the last resort. |
| **Cache-First** | All requests served from RAM; scrapers run in background. |
| **Resilience** | Source errors do not crash the API; stale data is served with a warning flag. |
| **No Source Spam** | Adaptive cron aligned with the government price adjustment schedule. |
| **Transparent Metadata** | Returns source, scrape time, TTL, stale/protection status, and tier. |
| **CDN-Friendly** | Explicit \`Cache-Control\` headers enable efficient CDN/proxy caching. |

---

## Appendix — Price Region Classification

| Type | Count | Note |
| :--- | :--- | :--- |
| Region 1 (full province) | 43 | Standard price |
| Region 2 (full province) | 15 | Up to +2% above Region 1 |
| Partial | 4 (QN, BT, BR-VT, KG) | Some districts/islands are Region 2 |

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
`;

const ROOT = path.resolve(__dirname, '..');
fs.writeFileSync(path.join(ROOT, 'docs', 'vi', 'architecture.md'), vi, 'utf8');
fs.writeFileSync(path.join(ROOT, 'docs', 'en', 'architecture.md'), en, 'utf8');
console.log('Done — both architecture files written in UTF-8');
