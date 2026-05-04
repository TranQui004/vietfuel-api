# CHANGELOG

> All notable changes to **VietFuel API** are documented here.
> Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [Unreleased] — 2026-05-04

### 🙏 Special Thanks

This release was significantly improved thanks to the excellent blog post **"Building a Low-RAM Vietfuel API"** by **toidicakhia** ([@toidicakhia](https://github.com/toidicakhia)).

The author pointed out directly and technically that Playwright — while powerful — is unnecessarily resource-heavy for data sources that don't require JavaScript rendering. The author also shared a clever PVOil Cloudflare bypass technique using direct IP access with a `Host` header.

We sincerely thank the author for identifying these weaknesses and sharing improvements. We have obtained permission to adopt these ideas into the project, with full credit in the source code. Community feedback like this is what drives this project forward.

- Blog: https://toidicakhia.me/blog/build-vietfuel-api-phien-ban-it-ram
- Author's demo: https://fuelprice.toidicakhia.me

### ✨ Added
- Script `scripts/update-mockdata.js`: automatically fetches live data from the API and overwrites `websites/mock-data/fuel-prices.json`. Run with `npm run update-mockdata`.
- Website demo: replaced the "Fleet" and "Finance" tabs with interactive chart views.

### 🔧 Improved (RAM-Optimized Scrapers)
Applied **"HTTP-first, browser-fallback"** strategy for sources that don't require JavaScript rendering, significantly reducing RAM usage (from ~150-200MB/scraper to ~0MB when HTTP succeeds):

| Scraper | Change |
|---|---|
| **Comeco** | New Tier 1: `node-fetch` + `cheerio` to parse static HTML. |
| **Petrotimes** | New Tier 1: Directly calls internal API `/site/get-petro` — no browser needed. |
| **SaigonPetro** | New Tier 1: Fetch main page → extract `data-list` → call dynamic `/load-time` API. |
| **PVOil** | New Tier 0: Bypass Cloudflare via origin IP `103.21.120.100` with `Host: www.pvoil.com.vn` header. |

> All scrapers retain Playwright as the final fallback tier to ensure stability.

### 📦 Dependencies
- Added `cheerio` and `node-fetch@2` to `backend/package.json`.

---

## [1.0.0] — 2026-04-01

### ✨ Initial Release
- Real-time fuel price API from 11 official Vietnamese fuel distributors.
- Supports Zone 1 / Zone 2 pricing per Decree 80/2023/ND-CP.
- Adaptive Cron mechanism aligned with the government's price adjustment schedule.
- Multi-layer cache system with Stale-While-Revalidate.
- FleetOps Demo Dashboard at `websites/`.

---

*© 2026 TranQui — [github.com/TranQui004](https://github.com/TranQui004) — MIT License*
