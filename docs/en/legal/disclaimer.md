# Disclaimer — VietFuelAPI

> Last updated: April 26, 2026

---

## 1. Project Nature

VietFuelAPI is a **non-profit, community-driven project** built and maintained by volunteer developers. It has no official affiliation with Petrolimex, PVOil, Mipec, the Ministry of Industry and Trade (MOIT), or any Vietnamese government agency.

---

## 2. Data Accuracy Limitations

Data provided by VietFuelAPI is automatically aggregated from **11 public sources**. While we strive for accuracy, we **cannot guarantee**:

- **Absolute accuracy**: Data may deviate due to scraping errors or source website structural changes.
- **Completeness**: Some price adjustment cycles may be reflected with a delay (up to ~15 minutes on Thursdays, up to 6 hours on other days).
- **Continuity**: The service may be disrupted if a source implements blocking measures or restructures its data.

When a source fails, the API serves **Stale Cache** and clearly marks it with `"isStale": true` in the JSON response.

---

## 3. Disclaimer of Liability

Users **assume full responsibility** for decisions made using VietFuelAPI data, including:

- Financial and investment decisions
- Commercial and business decisions
- Legal and administrative filings
- Transportation and logistics planning

**For official price references**, please visit:
- Petrolimex: [petrolimex.com.vn](https://www.petrolimex.com.vn)
- PVOil: [pvoil.com.vn](https://www.pvoil.com.vn)
- MOIT Portal: [moit.gov.vn](https://www.moit.gov.vn)

---

## 4. Data Collection Method

VietFuelAPI collects data through:

- **Transparent Bot User-Agent**: `VietFuelBot/1.0 (Community non-profit; +https://github.com/TranQui004/vietfuel-api)` — allows source administrators to identify and contact us.
- **Reasonable frequency**: Adaptive schedule aligned with Decree 80/2023/ND-CP (maximum every 15 minutes on Thursdays, every 4–6 hours on other days).
- **Historical Storage**: Price data from adjustment periods is stored locally in D1/SQLite for statistical and analytical purposes.

---

## 5. Trademarks

All trade names, logos, and trademarks appearing in this project (Petrolimex, PVOil, Mipec, COMECO, Saigon Petro, etc.) are **property of their respective owners**. VietFuelAPI uses these names solely for source attribution and makes no claim of ownership or commercial affiliation.

---

## 6. Contact

If you are an administrator of a data source and wish to request removal or adjustment of collection methods, please contact us via **GitHub Issues**: [github.com/TranQui004/vietfuel-api/issues](https://github.com/TranQui004/vietfuel-api/issues).

We commit to responding within 72 hours.

---

🔗 [Back to Legal Index](README.md) | [Tiếng Việt →](../../vi/legal/disclaimer.md)
