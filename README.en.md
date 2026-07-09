<p align="center">
  <img src="public/brand/VietFuelAPI_header.png" alt="VietFuelAPI Banner" width="800">
</p>

<h1 align="center">VietFuelAPI</h1>

<p align="center">
  <strong>Real-time Vietnam Fuel Price Data — 11 Sources, 63 Provinces, Accurate Region 1 &amp; 2 classification.</strong>
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
  <img src="docs/assets/mockup_readme_en.png" alt="VietFuelAPI Mockup English" width="900">
</p>

---

Vietnamese version: [README.md](README.md)

---

## 📖 Table of Contents

- [Introduction](#-introduction)
- [Key Features](#-key-features)
- [Using the API](#-using-the-api)
- [API Endpoints](#-api-endpoints)
- [Running Locally (for Developers)](#-running-locally-for-developers)
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

- 🚀 **Fast**: Responses served from cache with low latency.
- 🔄 **Auto-Sync**: Smart Adaptive Cron syncs precisely with the government's price adjustment cycle.
- 🔗 **11 Data Sources**: Integrated with Stealth Fallback Bot technology to bypass anti-bot protections.
- 📊 **Visual UI**: Two Dashboard pages designed with [ApexCharts](https://apexcharts.com/).
  - **Live Data** (`/`): Auto-updates every minute, supports Dark/Light mode, and compares prices across 63+ provinces.
  - **Statistics Dashboard** (`/history`): Grouped Column Chart comparing Region 1 vs Region 2 prices, along with a comprehensive market data table featuring smart **Filtering** (by source) and **Sorting** capabilities.
- 🖥️ **CLI Console Dashboard**: Interactive terminal interface (\`npm run cli\`) for operators to query prices, search history, inspect health and active storage paths, and clear memory cache without a browser.
- 🗺️ **63 Provinces**: On-demand province-level pricing with region metadata.
- 🛡️ **Accurate Regions**: 15 full Region 2 provinces + 4 partial-region provinces correctly classified.
- 🔑 **No Auth Required**: Open to all developers, full CORS support.

## 🌐 Using the API

The API is publicly hosted. You can call it directly without installing anything:

```bash
# Get unified fuel prices (all sources)
curl https://vietfuel-api.tranqui.workers.dev/api/fuel-prices

# Get prices from a specific source
curl https://vietfuel-api.tranqui.workers.dev/api/fuel-prices/petrolimex

# Get prices by province
curl https://vietfuel-api.tranqui.workers.dev/api/fuel-prices/province/ha-noi
```

**Web interfaces:**
- 🏠 Home: `https://vietfuel-api.tranqui.workers.dev/`
- 📊 Live Data: `https://vietfuel-api.tranqui.workers.dev/live`
- 📈 Statistics & History: `https://vietfuel-api.tranqui.workers.dev/history`
- 🔬 Test API: `https://vietfuel-api.tranqui.workers.dev/test-api`

## 📡 API Endpoints

### National Sources

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/fuel-prices` | **(Recommended)** Aggregated data from all 11 sources |
| `GET` | `/api/fuel-prices/:source` | Source-specific data: `petrolimex`, `kv2_petrolimex`, `saigon_petrolimex`, `vungtau_petrolimex`, `pvoil`, `mipec`, `comeco`, `saigonpetro`, `petrotimes`, `webgia`, `giaxanghomnay` |

### Province-level (on-demand)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/provinces` | Full list of 63 provinces with `id`, `slug`, `region` |
| `GET` | `/api/provinces?region=2` | Filter by region |
| `GET` | `/api/fuel-prices/province/:slug` | Per-province prices (e.g., `/api/fuel-prices/province/ha-noi`) |

### System & History

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status of all 11 data sources |
| `GET` | `/api/sources` | Full list of 11 sources with cache status |
| `GET` | `/api/history` | Price history (supports `?limit=` query and `/api/history/:fuel_name` filter) |

### Sample Response

```json
{
  "success": true,
  "status": "ok",
  "meta": {
    "primarySource": "Petrolimex",
    "priceDate": "2026-05-15",
    "priceDateDisplay": "15/05/2026",
    "sourceCount": 11,
    "totalItems": 7
  },
  "data": [
    { "name": "Xăng RON 95-V", "region1": 24730, "region2": 25220, "unit": "VND/lít" },
    { "name": "Xăng RON 95-III", "region1": 24330, "region2": 24810, "unit": "VND/lít" }
  ]
}
```

## 💻 Running Locally (for Developers)

Want to study the code or build new features? Clone and run locally:

```bash
git clone https://github.com/TranQui004/vietfuel-api.git
cd vietfuel-api

# Install dependencies
npm install

# Start local dev server (Wrangler dev — uses simulated KV, no Cloudflare account needed)
npx wrangler dev
```

*Open your browser and navigate to: `http://localhost:8787`*

### 🖥️ Interactive CLI Dashboard
After starting the local server, run the terminal console interface by executing:
```bash
npm run cli
```

> [!NOTE]
> Wrangler automatically creates a simulated local KV store for development — **no Cloudflare account required** to run locally.

Default local URL: `http://localhost:8787`

Frontend pages:
- Home: `http://localhost:8787/`
- Live Data: `http://localhost:8787/live`
- Test API: `http://localhost:8787/test-api`

### 🌐 Self-Hosted (Community)

You can host your own instance on Cloudflare Workers for free (Free tier: 100,000 req/day):

1. **Create a Cloudflare account** at [cloudflare.com](https://cloudflare.com) (free)
2. **Create a KV Namespace** on Dashboard: Workers & Pages → KV → Create namespace named `FUEL_CACHE`
3. **Edit `wrangler.toml`**: replace `YOUR_KV_NAMESPACE_ID_HERE` with your real namespace ID
4. **Deploy**:

```bash
npx wrangler login
npx wrangler deploy
```

> [!NOTE]
> Your self-hosted instance runs **completely independently** from the official production — separate data, cache, and Cron Jobs.

> [!IMPORTANT]
> The **official production** at `https://vietfuel-api.tranqui.workers.dev` is maintained by the project maintainer. If you just want to **use the API** without self-hosting, call the public endpoints in [Using the API](#-using-the-api) above.

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

- **Runtime**: Cloudflare Workers (V8 isolates) + Hono framework.
- **Scraping**: `fetch` + `cheerio` — **HTTP-only, no Playwright/headless browser**.
- **Cache**: Cloudflare KV (`FUEL_CACHE`) — data served from the edge closest to the user.
- **Scheduler**: Cloudflare Cron Triggers — adaptive schedule aligned with **Decree 80/2023/ND-CP**.
- **Frontend**: Static HTML/CSS/JS — served via Cloudflare CDN, no JS framework required.

## 📁 Project Structure

```text
├── backend/
│   └── src/
│       ├── index.js              # Hono entry point + router
│       ├── scraper.js            # Unified scraper entry point
│       ├── cache.js              # Cloudflare KV helpers
│       ├── scrapers/             # Independent scraping engines
│       │   ├── petrolimex.js     # Petrolimex (internal REST API)
│       │   ├── pvoil.js          # PVOil (Bypass Cloudflare)
│       │   ├── mipec.js          # Mipec
│       │   ├── comeco.js         # COMECO
│       │   ├── saigonpetro.js    # Saigon Petro
│       │   ├── petrotimes.js     # Petro Times
│       │   ├── webgia.js         # WebGia (Petrolimex mirror)
│       │   └── giaxanghomnay.js  # GiaXangHomNay (63 provinces)
│       ├── db/
│       │   ├── repository.js     # Price History (D1/SQLite)
│       │   └── schema.sql        # History table structure
│       ├── data/
│       │   └── provinces.json    # 63 provinces dataset (slug, region, districts)
│       └── utils/
│           └── fuel-helpers.js   # Normalize, sort, build response
├── public/                       # Frontend assets (HTML, CSS, JS, Images)
│   ├── index.html                # Landing page
│   ├── live.html                 # Live Data Dashboard
│   ├── history.html              # Statistics & History Dashboard
│   ├── endpoints.html            # API Reference documentation
│   ├── test-api.html             # Visual API testing tool
│   ├── css/                      # Stylesheets
│   ├── js/                       # Frontend JS logic (including history.js)
│   └── brand/                    # Logo & Banners
├── docs/                         # Technical documentation (VI/EN)
├── wrangler.toml                 # Cloudflare Workers config (template)
└── package.json
```

## 📚 Detailed Docs

- [System Architecture](docs/en/architecture.md)
- [Changelog History](CHANGELOG.en.md)
- [Comment Convention](docs/en/guides/comment-style.md)

## 🤝 Legal & Community

- [Contributing Guide (CONTRIBUTING.md)](CONTRIBUTING.md)
- [Code of Conduct](docs/en/community/code-of-conduct.md)
- [Security Policy](docs/en/community/security.md)
- [Support](docs/en/community/support.md)

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
