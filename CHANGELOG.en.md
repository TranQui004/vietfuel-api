# CHANGELOG

> All notable changes to **VietFuel API** are documented here.
> Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [Unreleased] — 2026-05-04

### 🙏 Special Thanks

This release was significantly improved thanks to the excellent blog post **"Building a Low-RAM Vietfuel API"** by **toidicakhia** ([@toidicakhia](https://github.com/toidicakhia)).

The author pointed out directly and technically that Playwright — while powerful — is unnecessarily resource-heavy for data sources that don't require JavaScript rendering. The author also shared a clever PVOil Cloudflare bypass technique using direct IP access with a `Host` header.

We sincerely thank the author for identifying these weaknesses and sharing improvements. We have adopted these ideas with full credit in the source code. Community feedback like this is what drives this project forward.

- Blog: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
- Author's demo: https://fuelprice.toidicakhia.me

### 🔧 Improved (RAM-Optimized Scrapers)

Applied **"HTTP-first, browser-fallback"** strategy for sources that don't require JavaScript rendering, significantly reducing RAM usage (from ~150-200MB/scraper to ~0MB when HTTP succeeds):

| Scraper | Change |
|---|---|
| **Comeco** | New Tier 1: `node-fetch` + `cheerio` to parse static HTML. Playwright retained as fallback. |
| **Petrotimes** | New Tier 1: Directly calls internal API `/site/get-petro` — no browser needed. |
| **SaigonPetro** | New Tier 1: Fetch main page → extract `data-list` → call dynamic `/load-time` API. |
| **PVOil** | New Tier 0: Bypass Cloudflare via origin IP `103.21.120.100` with `Host: www.pvoil.com.vn` header. |

### 📦 Dependencies
- Added `cheerio` and `node-fetch@2` to `backend/package.json`.

---

## [Unreleased] — 2026-04-xx

### ⏰ Adaptive Cron Schedule (Decree 80/2023/ND-CP)
- Replaced the fixed hourly cron with a 3-mode schedule backed by legal basis:
  - **Checking** (Mon–Wed): Every 4 hours — prices stable, conserve server resources.
  - **Hunting** (Thu, 14:30–16:00): Every 15 minutes — the window when MOIT announces new fuel prices.
  - **Maintenance** (Fri–Sun): Every 6 hours — prices settled, reduce bandwidth usage.
- Added legal citations in code comments: Decree 80/2023, 95/2021, 83/2014.
- Added `mode` field to job logs for operational monitoring.
- Full cron expressions (tested): `30,45 14 * * 4` and `0,15,30,45 15 * * 4`.

### 📡 New Endpoint: `GET /api/sources`
- Returns the full list of all 11 data sources with their current cache status.
- Fields returned: `id`, `label`, `url`, `populated`, `scrapedAt`, `ttlRemainingSeconds`, `isStale`.
- Provides transparency for the developer community to cross-reference data.

### 🔧 System-wide Stealth Optimization
- Moved `USER_AGENTS` pool, `pickRandomUA()`, and `humanDelay()` to `utils.js` — all scrapers calling `createBrowser()` now benefit automatically.
- Pool expanded to 5 popular UAs (added Linux/Chrome UA).
- Removed duplicate code from `pvoil.js`.

### ⛽ PVOil Upgrade — 3-Tier Fallback Strategy
- **Tier 1 — Stealth Direct**: Scrapes `pvoil.com.vn` directly with real-browser simulation techniques.
- **Tier 2 — GXHN Fallback**: Text scrape via `giaxanghomnay.com` — a public aggregator.
- **Tier 3 — Light HTTP Fetch**: Pure HTTPS call without Playwright to static HTML aggregators.
- Added `_tier` field to scraper result (1/2/3) so monitoring knows exactly which tier served the data.

### 📁 Documentation Structure Update
- Updated project directory tree in README (VI/EN) to accurately reflect the real codebase.
- Added `docs/assets/` directory for README preview images.

### 📘 GitHub Readiness & Community Docs
- Added community/legal files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `DISCLAIMER.md`.
- Added code comment convention doc: `docs/comment-style.md`.
- Updated README (VI/EN) for the repository `TranQui004/vietfuel-api`.

### ⚙️ Backend Refactoring
- **Extracted Config Data**: Moved the 63 provinces definition array into `backend/data/provinces.json`.
- **Isolated Scraper Modules**: Split monolithic `scraper.js` into 9 child files under `backend/services/scrapers/`.
- **Boot Resource Optimization**: Replaced parallel `Promise.all` browser boot with sequential execution — eliminates Playwright RAM spikes.
- **Path Resolution Fix**: Applied `path.join(__dirname)` for `cache.json` to prevent cache drops.
- **Gzip/Brotli Compression**: Reduces API response size by ~70%.
- **Security Hardening (`helmet`)**: Auto-applies full HTTP Security Headers suite.
- **PM2 Deployment Config**: Added `ecosystem.config.js` for production server management.
- **Adaptive Stale Cache**: Disabled auto-deletion of expired cache — API never returns 503 on scraper failure.

### 🛠 Documentation & System Alignment
- Completed smoke tests for all scraper endpoints. Run via `npm run test`.
- Comprehensive README, changelog, and architecture docs update (both EN/VI).

---

## [1.0.0] — 2026-04-02

### ✨ Initial Release
- **Comprehensive Fuel API**: Real-time retail fuel price data in Vietnam (refreshed hourly).
- **Default Endpoint (`/api/fuel-prices`)**: Aggregates the most accurate data from 11 sources. Uses Petrolimex as primary base, falls back to other sources for missing dates.
- **11 Supported Sources**: Petrolimex + 3 Petrolimex mirrors, PVOil, Mipec, COMECO, Saigon Petro, Petro Times, WebGia, and GiaXangHomNay.
- **63 Provinces**: On-demand scraping per province. Accurately classifies Region 1, Region 2, and 4 Partial Region provinces.
- **Complete Documentation**: Interactive API Reference, Sandbox Playground, and Live Data Dashboard.
- **Security & Performance**: Rate Limiting (60/20 req/min) with In-memory Cache & Disk Fallback.

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
