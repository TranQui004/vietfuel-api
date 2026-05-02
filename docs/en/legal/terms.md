# Terms of Service — VietFuelAPI

> Last updated: April 26, 2026

---

## 1. Acceptance of Terms

By accessing this website or using data from **VietFuelAPI**, you agree to comply with all terms below. If you disagree, please discontinue use immediately.

---

## 2. Source License

VietFuelAPI source code is released under the **MIT License**:

- Free to use, copy, modify, and redistribute for **any purpose**, including commercial use.
- Only requirement: retain the original copyright notice.
- See details at: [`LICENSE`](../../../LICENSE) in the project root.

However, **collected data** (fuel prices from external sources) is not owned by VietFuelAPI and is subject to the individual terms of each source.

---

## 3. Intellectual Property

All trade names, logos, and trademarks from integrated data sources (Petrolimex, PVOil, Mipec, COMECO, Saigon Petro, Petro Times, WebGia, GiaXangHomNay…) are **property of their respective owners** and appear solely for source attribution purposes.

---

## 4. Usage Restrictions & System Protection

To protect community infrastructure, the following behaviors are **strictly prohibited**:

| Behavior | Description |
|:---|:---|
| DDoS attacks | Intentionally overwhelming the server |
| Exceeding rate limits | >60 req/min (national) or >20 req/min (province) per IP |
| Fraudulent use | Misrepresenting data to deceive end users |
| Reverse-engineering | Bypassing protection mechanisms to exploit the system |
| Data reselling | Selling API data as a commercial product without attribution |

Violations may result in **permanent IP banning** and notification to the hosting provider.

---

## 5. Integrator Responsibilities

If you integrate VietFuelAPI into your application or service:

- **Attribution required**: Credit `VietFuelAPI` or link to the project.
- **Disclaimer notice**: Clearly inform end users that data is for reference only.
- **No official claims**: Do not present data as an official source from MOIT or fuel companies.

---

## 6. Bot & Scraping Conduct

VietFuelAPI operates as a public data collection bot. We commit to:

- Using a **transparent User-Agent** (`VietFuelBot/1.0`) so sources can identify us.
- Respecting **robots.txt** of data sources where available.
- Not storing sensitive data or personally identifiable information (PII).
- Ceasing collection immediately upon a valid request from a source owner.

---

## 7. Disclaimer of Warranty

VietFuelAPI is provided **"as-is"**. We do not guarantee:

- 24/7 service continuity.
- Data always reflecting real-time prices immediately.
- Functionality when sources restructure or implement access blocking.

In these situations, the API returns cached data with `"isStale": true`.

---

## 8. Changes to Terms

VietFuelAPI may update these terms at any time. The "Last updated" date at the top of this document reflects the latest changes. Continued use of the API after changes constitutes acceptance of the updated terms.

---

🔗 [Back to Legal Index](README.md) | [Tiếng Việt →](../../vi/legal/terms.md)
---
**� 2026 TranQui - [GitHub: TranQui004](https://github.com/TranQui004)**
*VietFuel API Project*
