<p align="center">
  <img src="public/brand/VietFuelAPI_header.png" alt="VietFuelAPI Banner" width="800">
</p>

<h1 align="center">VietFuelAPI</h1>

<p align="center">
  <strong>Real-time Vietnam Fuel Price Data — 11 Sources, 63 Provinces, Accurate Region 1 & 2 classification.</strong>
</p>

<p align="center">
  <a href="https://github.com/TranQui004/vietfuel-api/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/TranQui004/vietfuel-api?style=for-the-badge&color=f59e0b" alt="License">
  </a>
  <img src="https://img.shields.io/badge/Refresh-Adaptive%20Cron-blue?style=for-the-badge&logo=clockify" alt="Refresh Cycle">
  <img src="https://img.shields.io/badge/Sources-11%20Providers-orange?style=for-the-badge&logo=databricks" alt="Data Sources">
  <img src="https://img.shields.io/badge/Provinces-63-green?style=for-the-badge" alt="63 Provinces">
  <img src="https://img.shields.io/badge/PRs-welcome-ef4444?style=for-the-badge" alt="PRs Welcome">
</p>


<p align="center">
  <img src="docs/assets/mockup_readme_en.png" alt="VietFuelAPI Mockup Vietnamese" width="900">
</p>

---

Vietnamese version: [README.md](README.md)

---

## 📖 Table of Contents

- [Introduction](#-introduction)
- [Key Features](#-key-features)
- [Quick Start](#-quick-start)
- [API Endpoints](#-api-endpoints)
- [Price Region Classification](#-price-region-classification)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Detailed Docs](#-detailed-docs)
- [Legal & Community](#-legal--community)
- [License](#-license)

---

## 👋 Introduction

**VietFuelAPI** is an API service providing real-time retail fuel price data for Vietnam in JSON format. Data is aggregated from **11 official sources** (including Petrolimex and Petrolimex mirrors, PVOil, Mipec, COMECO, Saigon Petro, Petro Times, WebGia, and GiaXangHomNay) and adaptively refreshed per the **Decree 80/2023** schedule.

The API supports per-province price lookup across all **63 provinces**, with accurate **Region 1** (standard price) and **Region 2** (up to +2% surcharge) classification per current regulations.

> [!IMPORTANT]
> This is a community-driven project for learning and technical research, and does not represent any organization, enterprise, or government agency.

## ✨ Key Features

- 🚀 **Ultra-fast**: Responses from in-memory cache (RAM), < 10ms latency.
- 🔄 **Auto-Sync**: Smart Adaptive Cron syncs precisely with the government's price adjustment cycle.
- 🔗 **11 Data Sources**: Integrated with Stealth Fallback Bot technology to bypass anti-bot protections.
- 🗺️ **63 Provinces**: On-demand province-level pricing with region metadata.
- 🛡️ **Accurate Regions**: 15 full Region 2 provinces + 4 partial-region provinces correctly classified.

- 🔒 **Rate Limiting**: 60 req/min for national sources, 20 req/min for on-demand provinces.
- 🌍 **HTTP Cache-Control**: Proper `Cache-Control` + `stale-while-revalidate` headers for CDN compatibility.
- 🔑 **No Auth Required**: Open to all developers, full CORS support.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/TranQui004/vietfuel-api.git
cd vietfuel-api

# Install dependencies
npm install

# Start local server (Wrangler dev)
npm run dev
```

Default local URL: `http://localhost:8787`

Frontend pages are served on the same port:
- Home: `http://localhost:8787/`
- Live Data: `http://localhost:8787/live`
- Test API: `http://localhost:8787/test-api`

### 🚀 Production Deployment (Cloudflare Workers)

This project uses a Serverless architecture (Cloudflare Workers), eliminating the need for VPS hosting or PM2:

```bash
# Log in to your Cloudflare account (if not already logged in)
npx wrangler login

# Deploy to Cloudflare's global edge network
npx wrangler deploy
```

## 📡 API Endpoints

### National Sources

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/fuel-prices` | **(Recommended)** Aggregated best data from available sources (Default) |
| `GET` | `/api/fuel-prices/:source` | Source-specific data by source `id` (for example: `petrolimex`, `pvoil`, `mipec`, `comeco`, `saigonpetro`, `petrotimes`, ...). Full list is returned in `availableSources` when source is invalid |

### Province-level (on-demand)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/provinces` | Full list of 63 provinces with `id`, `slug`, `region` |
| `GET` | `/api/provinces?region=2` | Filter by region |
| `GET` | `/api/fuel-prices/province/:slug` | Per-province prices (e.g., `/api/fuel-prices/province/ha-noi`) |

### System

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status of all 11 data sources |
| `GET` | `/api/sources` | Full list of 11 sources with cache status (transparency for developers) |

### Web UI

| URL | Description |
| :--- | :--- |
| `/` | Home page — API overview |
| `/live` | Live Dashboard — real-time prices from all 11 sources |
| `/endpoints` | API Reference — full documentation |
| `/test-api` | **Test API** — test endpoints directly in the browser |

### Sample Response

```json
{
  "success": true,
  "status": "ok",
  "meta": {
    "source": "Petrolimex",
    "priceDate": "2026-03-27",
    "priceDateDisplay": "27/03/2026",
    "cacheHit": true,
    "cacheTtlRemainingSeconds": 3480,
    "totalItems": 7
  },
  "data": [
    { "name": "Xăng RON 95-V", "region1": 24730, "region2": 25220, "unit": "VND/lít" },
    { "name": "Xăng RON 95-III", "region1": 24330, "region2": 24810, "unit": "VND/lít" }
  ]
}
```

## 🗺️ Price Region Classification

Vietnam's retail fuel prices are divided into two regions per current regulations:

| Region | Description | Provinces |
| :--- | :--- | :--- |
| **Region 1** | Near depots and transport hubs. Standard price. | 43 provinces (full) |
| **Region 2** | Remote areas, islands, mountainous regions. **Up to +2% surcharge.** | 15 provinces (full) + 4 partial |

**15 full Region 2 provinces:** Hà Giang, Cao Bằng, Bắc Kạn, Tuyên Quang, Lào Cai, Điện Biên, Lai Châu, Sơn La, Yên Bái, Lạng Sơn, Kon Tum, Gia Lai, Đắk Lắk, Đắk Nông, Lâm Đồng.

**4 partial provinces** (specific districts only are Region 2):

| Province | Region 2 Districts |
| :--- | :--- |
| Quảng Ninh | Vân Đồn, Cô Tô, Hải Hà |
| Bình Thuận | Phú Quý island |
| Bà Rịa - Vũng Tàu | Côn Đảo island |
| Kiên Giang | Phú Quốc city, Kiên Hải island |

> The API returns `partialRegion: true` and a `vung2Districts` array for these 4 provinces in `/api/provinces`.

## 🛠️ Tech Stack

- **Backend (Serverless)**: Node.js v22+, Hono, Cloudflare Workers V8 runtime.
- **Scraping**: `fetch` + `cheerio` — **HTTP-only, no Playwright/headless browser**.
- **Cache**: Cloudflare KV (`FUEL_CACHE`).
- **Scheduler**: Cloudflare Cron Triggers — 3-mode adaptive schedule aligned with **Decree 80/2023/ND-CP**:
  - Mon–Wed: Every 4 hours (Checking)
  - Thu, 07:30–09:00 UTC: Every 15 minutes (Hunting — price adjustment window VN time)
  - Fri–Sun: Every 6 hours (Maintenance)
- **Frontend**: Static HTML/CSS/JS — served blazing fast via Cloudflare CDN (no JS framework).
- **API Testing**: Custom Test API interface at `/test-api`.

## 📁 Project Structure

```text
├── src/
│   ├── index.js              # Hono entrypoint + static serving & router
│   ├── config.js             # Source & KV configuration
│   ├── scrapers/             # Independent scraping logic
│   │   ├── petrolimex.js     # Petrolimex (Tier 0 REST API)
│   │   ├── pvoil.js          # PVOil (Bypass CF)
│   │   ├── mipec.js          # Mipec
│   │   ├── comeco.js         # COMECO
│   │   ├── saigonpetro.js    # Saigon Petro
│   │   ├── petrotimes.js     # Petro Times
│   │   ├── webgia.js         # WebGia
│   │   └── giaxanghomnay.js  # GiaXangHomNay
│   ├── scraper.js            # Unified scraper entry point
│   └── utils/
│       ├── fuel-helpers.js   # Normalize data & province info
│       └── regions.json      # Mapping for regions (Region 1, Region 2, partial)
├── public/                   # Frontend assets (HTML, CSS, JS, Images)
│   ├── index.html            # Landing page
│   ├── live.html             # Live Data Dashboard
│   ├── endpoints.html        # API Reference documentation
│   ├── test-api.html         # Visual API testing tool
│   ├── css/                  # Stylesheets
│   ├── js/                   # Frontend JS logic
│   └── brand/                # Logo & Banners
├── docs/                     # Technical documentation (VI/EN)
├── wrangler.toml             # Cloudflare Workers & KV config
└── package.json              # Dependency management
```

## 📚 Detailed Docs

- [System Architecture](docs/en/architecture.md)
- [Changelog History](docs/en/changelog.md)
- [Comment Convention](docs/en/guides/comment-style.md)
- [Live API Documentation](http://localhost:3000)

## 🤝 Legal & Community

- [Legal Index](docs/en/legal/README.md)
- [Contributing Guide (CONTRIBUTING.md)](CONTRIBUTING.md)
- [Code of Conduct](docs/en/community/code-of-conduct.md)
- [Security Policy](docs/en/community/security.md)
- [Support](docs/en/community/support.md)

### What should be pushed to GitHub

- Source code under `src/`, `public/`, `docs/`
- Community and legal markdown files
- Production config files such as `wrangler.toml`

### What should not be pushed

- `node_modules/`, `.wrangler/`
- Any log files or debug dumps

## ⚖️ License

Distributed under the **MIT** license. See `LICENSE` for more details.

---

<p align="center">
  <img src="public/brand/VietFuelAPI_footer.png" alt="VietFuelAPI Footer" width="120">
</p>

<p align="center">
  <strong>© 2026 TranQui - <a href="https://github.com/TranQui004">GitHub: TranQui004</a></strong><br>
  Built with ❤️ by Developers for Developers.
</p>
