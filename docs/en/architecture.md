# System Architecture — VietFuel API

## Overview

VietFuel API aggregates real-time fuel prices in Vietnam from 11 official distributors. The system has been fully migrated to a **Serverless (Cloudflare Workers)** architecture powered by **Hono**.
All scrapers operate via `fetch + cheerio` with **zero Headless Browser (Playwright) dependencies**. This completely eliminates VPS hosting costs ($0), accelerates response times (via Cloudflare's Edge Network), minimizes RAM consumption, and runs natively on the Cloudflare V8 runtime.

---

## Scraper Service (`src/scrapers/`)

| Source | Primary Strategy | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | **Tier 0**: VIEApps CMS REST API (JSON, no auth required) | Tier 1: GXHN HTTP → Tier 2: WebGia HTTP |
| KV2 / Saigon / VungTau Petrolimex | Mirror sync from Petrolimex | — |
| **PVOil** | **Tier 0**: Bypass Cloudflare via Origin IP | Tier 1: HTTP direct → Tier 2: GXHN HTTP fallback |
| **Mipec** | HTTP fetch + cheerio SSR parse from mipec.com.vn | GXHN HTTP fallback |
| **COMECO** | HTTP fetch + cheerio static HTML parse | — |
| **Saigon Petro** | HTTP fetch → extract `data-list` → call dynamic `/load-time` API | — |
| **Petro Times** | HTTP fetch directly to internal API `/site/get-petro` | — |
| **WebGia** | HTTP fetch + cheerio parse (unique `<th>` structure) | — |
| **GiaXangHomNay** | HTTP fetch + cheerio SSR parse | — |

> **Technique credits**:
> - PVOil Cloudflare bypass and HTTP-first strategy inspired by:
>   [_"Building a Low-RAM Vietfuel API"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) — **toidicakhia**
> - Petrolimex REST API endpoint discovered by:
>   [`petro_price.sh` gist](https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264) — **@nguynkhn**

**Price Date**: All `priceDate` values are normalized to **ISO 8601 (YYYY-MM-DD)**. The response also includes `priceDateDisplay` (DD/MM/YYYY) for UI rendering.

---

## Cache Service (Cloudflare KV)

The entire caching system is now managed by **Cloudflare KV Namespace** (`FUEL_CACHE`), ensuring global state synchronization with ultra-low latency.

| Cache Type | Storage | TTL | Populated |
| :--- | :--- | :--- | :--- |
| National Data (`prices:source`) | Cloudflare KV | 0 (Never expires) | Cron Trigger (Scheduled) or On-demand |
| Province Data (`province:slug`) | Cloudflare KV | Custom (3600s) | On-demand (Upon request) |
| Metadata & Stats | Cloudflare KV | 0 (Never expires) | Written alongside every update |

**Stale Cache Fallback**: Auto-deletion (TTL) is disabled for national data. If the crawler fails, the API returns stale data (Cache Hit) with `isStale: true` instead of crashing with a 503 error.

---

## Rate Limiting & Proxy

Running on Cloudflare Workers allows the system to inherit all security features of the Cloudflare network:
- **Rate Limit**: Managed natively by Cloudflare WAF.
- **Cache-Control headers**: Fine-tuned so Cloudflare CDN serves end users directly without waking up the Worker.
  - National: `Cache-Control: public, max-age=3600, stale-while-revalidate=60`
  - Province (cache hit): `Cache-Control: public, max-age=<ttl_remaining>`
  - Province list: `Cache-Control: public, max-age=86400` (static, 24h)

---

## Adaptive Cron (Wrangler Triggers)

Automated data scraping is executed via **Cloudflare Cron Triggers** (`wrangler.toml`), aligned with Decree 80/2023/ND-CP:

| Mode | Schedule (UTC) | Frequency | Reason |
| :--- | :--- | :--- | :--- |
| **Checking** | Mon – Wed | Every 4 hours | Prices stable, conserve resources |
| **Hunting** | Thu 07:30–09:00 (UTC) | Every 15 minutes | MOIT price announcement window (14:30 - 16:00 VN) |
| **Maintenance** | Fri – Sun | Every 6 hours | Prices settled, reduce bandwidth |

---

## Data Quality Model

- **Date normalization**: `priceDate` is always `YYYY-MM-DD`.
- **UI-friendly display**: `priceDateDisplay` field in `DD/MM/YYYY` format.
- **Stale warning**: `isStale: true` when data exceeds TTL.
- **Protection warning**: `blockedByProtection: true` when PVOil blocks direct access.
- **Tier tracking**: `_tier` field (0/1/2/3) in scraper result for monitoring.

---

## Test API UI (`/test-api`)

A custom API testing interface, uniquely designed for VietFuel API:

| Feature | Description |
| :--- | :--- |
| **Endpoint sidebar** | 11 endpoints grouped: Aggregated / Single Source / Geographic / System |
| **Request builder** | Auto-populated URL bar + params dropdown (63 provinces) |
| **Live JSON viewer** | Syntax highlighting + status badge + latency + response size |
| **Code snippets** | Auto-generates cURL / JavaScript / Python from current config |
| **No dependencies** | Pure Vanilla JS — no framework overhead, ultra-fast load via Cloudflare CDN |

> Access at: `/test-api`

---

## Design Principles (V2 Serverless)

| Principle | Description |
| :--- | :--- |
| **Serverless Edge** | Runs 100% on Cloudflare Workers V8 Runtime, responding quickly worldwide. |
| **Zero-VPS** | No server costs, no need to maintain PM2, OS, or Native libraries (Playwright). |
| **Resilience** | Source errors do not crash the API; stale data is served with a warning flag via KV Cache. |
| **Transparent Metadata** | Returns source, scrape time, TTL, stale/protection status, and tier. |

---

## Appendix — Price Region Classification

| Type | Count | Note |
| :--- | :--- | :--- |
| Region 1 (full province) | 43 | Standard price |
| Region 2 (full province) | 15 | Up to +2% above Region 1 |
| Partial | 4 (QN, BT, BR-VT, KG) | Some districts/islands are Region 2 |

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
