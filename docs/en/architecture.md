# System Architecture — VietFuel API

## Overview

VietFuel API aggregates real-time fuel prices in Vietnam from 11 official distributors. It applies an **"HTTP-first, browser-fallback"** strategy: lightweight HTTP fetch is always tried first, Playwright headless browser is only used as a last resort, significantly reducing RAM usage.

---

## Scraper Service (`backend/services/scraper.js`)

| Source | Primary Strategy | Fallback |
| :--- | :--- | :--- |
| **Petrolimex** | Playwright (popup click) | Retry x4 |
| KV2 / Saigon / VungTau Petrolimex | Mirror sync from Petrolimex | — |
| **PVOil** | **Tier 0**: HTTP fetch origin IP `103.21.120.100` + `Host` header (Cloudflare bypass) | Tier 1: Playwright stealth → Tier 2: GiaXangHomNay text |
| **Mipec** | Playwright + news article fallback | GiaXangHomNay |
| **COMECO** | **Tier 1**: HTTP fetch + cheerio static HTML parse | Playwright |
| **Saigon Petro** | **Tier 1**: HTTP fetch → extract `data-list` → call dynamic `/load-time` API | Playwright |
| **Petro Times** | **Tier 1**: HTTP fetch directly to internal API `/site/get-petro` | Playwright |
| WebGia | HTTP Fetch / Playwright | — |
| GiaXangHomNay | Playwright | — |

> **Technique credit**: The PVOil Cloudflare bypass via origin IP and the HTTP-first strategy for COMECO, SaigonPetro, and Petrotimes were inspired by the blog post
> [_"Building a Low-RAM Vietfuel API"_](https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram) by **toidicakhia**.

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

## Design Principles

| Principle | Description |
| :--- | :--- |
| **HTTP-First** | Lightweight HTTP fetch before Playwright. Playwright is the last resort. |
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
