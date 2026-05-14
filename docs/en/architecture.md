# System Architecture — VietFuel API

## Overview

VietFuel API aggregates real-time fuel prices in Vietnam from 11 official distributors. The system uses a **HTTP-only architecture** — all scrapers operate via `node-fetch + cheerio` with **zero Playwright or headless browser dependencies**. This reduces RAM usage from ~200MB/scraper to ~0MB and shrinks the Docker image from ~2GB to ~50MB.

---

## Scraper Service (`backend/services/scraper.js`)

| Source | Primary Strategy | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | **Tier 0**: VIEApps CMS REST API `/~apis/portals/cms.item/search` (JSON, no auth required) | Tier 1: GXHN HTTP → Tier 2: WebGia HTTP |
| KV2 / Saigon / VungTau Petrolimex | Mirror sync from Petrolimex | — |
| **PVOil** | **Tier 0**: HTTP fetch origin IP `103.21.120.100` + `Host` header (Cloudflare bypass) | Tier 1: HTTP direct → Tier 2: GXHN HTTP fallback |
| **Mipec** | HTTP fetch + cheerio SSR parse from mipec.com.vn | GXHN HTTP fallback (date) |
| **COMECO** | HTTP fetch + cheerio static HTML parse | — |
| **Saigon Petro** | HTTP fetch → extract `data-list` → call dynamic `/load-time` API | — |
| **Petro Times** | HTTP fetch directly to internal API `/site/get-petro` | — |
| **WebGia** | HTTP fetch + cheerio parse (unique `<th>` structure) | — |
| **GiaXangHomNay** | HTTP fetch + cheerio SSR parse | — |

> **Technique credits**:
> - PVOil Cloudflare bypass via origin IP and HTTP-first strategy inspired by:
>   [_"Building a Low-RAM Vietfuel API"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) — **toidicakhia**
> - Petrolimex REST API endpoint discovered by:
>   [`petro_price.sh` gist](https://gist.github.com/nguynkhn/acc6431ea769da507c2aa3758891f264) — **@nguynkhn**

**Price Date**: All `priceDate` values are normalized to **ISO 8601 (YYYY-MM-DD)**. The response also includes `priceDateDisplay` (DD/MM/YYYY) for UI rendering.

---

## Cache Service (`backend/services/cache.js`)

| Cache | Type | TTL | Populated |
| :--- | :--- | :--- | :--- |
| `memCache` (national) | In-memory (node-cache) | 0 (Never expires) | Bootstrap + Cron |
| `provinceCache` | In-memory (node-cache) | 0 (Never expires) | On-demand |
| Disk persistence | `cache.json` | Survives restarts | Written after every update |

**Stale Cache Fallback**: Auto-deletion is disabled (`stdTTL = 0`). If the crawler fails, the API returns stale data with `isStale: true` instead of a 503 error.

---

## Rate Limiting

- **National sources**: 60 req/min/IP
- **Province endpoints**: 20 req/min/IP (heavier scraping)

**HTTP Cache-Control headers**:
- National: `Cache-Control: public, max-age=3600, stale-while-revalidate=60`
- Province (cache hit): `Cache-Control: public, max-age=<ttl_remaining>`
- Province (cache miss / error): `Cache-Control: no-store`
- Province list: `Cache-Control: public, max-age=86400` (static, 24h)

---

## Adaptive Cron (Decree 80/2023/ND-CP)

| Mode | Schedule | Frequency | Reason |
| :--- | :--- | :--- | :--- |
| **Checking** | Mon – Wed | Every 4 hours | Prices stable, conserve resources |
| **Hunting** | Thu 14:30–16:00 | Every 15 minutes | MOIT price announcement window |
| **Maintenance** | Fri – Sun | Every 6 hours | Prices settled, reduce bandwidth |

---

## Data Quality Model

- **Date normalization**: `priceDate` is always `YYYY-MM-DD`.
- **UI-friendly display**: `priceDateDisplay` field in `DD/MM/YYYY` format.
- **Stale warning**: `isStale: true` when data exceeds TTL.
- **Protection warning**: `blockedByProtection: true` when PVOil blocks direct access.
- **Tier tracking**: `_tier` field (0/1/2/3) in scraper result for monitoring.

---

## API Playground (`/playground`)

A custom API testing interface, fully replacing Swagger UI:

| Feature | Description |
| :--- | :--- |
| **Endpoint sidebar** | 11 endpoints grouped: Aggregated / Single Source / Province / System |
| **Request builder** | Auto-populated URL bar + params dropdown (63 provinces) |
| **Live JSON viewer** | Syntax highlighting + status badge + latency + response size |
| **Code snippets** | Auto-generates cURL / JavaScript / Python from current config |
| **No dependencies** | Pure Vanilla JS — no framework overhead, ultra-fast load |

> Access at: `http://localhost:3000/playground`

---

## Design Principles

| Principle | Description |
| :--- | :--- |
| **HTTP-Only** | All scrapers use lightweight HTTP fetch + cheerio — no headless browser at any tier. |
| **Cache-First** | All requests served from RAM; scrapers run in background. |
| **Resilience** | Source errors do not crash the API; stale data is served with a warning flag. |
| **No Source Spam** | Adaptive cron aligned with the government price adjustment schedule. |
| **Transparent Metadata** | Returns source, scrape time, TTL, stale/protection status, and tier. |
| **CDN-Friendly** | Explicit `Cache-Control` headers enable efficient CDN/proxy caching. |

---

## Appendix — Price Region Classification

| Type | Count | Note |
| :--- | :--- | :--- |
| Region 1 (full province) | 43 | Standard price |
| Region 2 (full province) | 15 | Up to +2% above Region 1 |
| Partial | 4 (QN, BT, BR-VT, KG) | Some districts/islands are Region 2 |

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
