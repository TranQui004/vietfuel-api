# Privacy Policy — VietFuelAPI

> Last updated: April 26, 2026

---

## 1. Core Principles

VietFuelAPI is built on the principle of **Data Minimization**. We collect only what is strictly necessary to operate the service and use no data for advertising purposes.

---

## 2. Data from API Users

We **do NOT** collect personally identifiable information (name, email, phone number, etc.). When you make a request to the API, the following technical information may be temporarily logged for operational purposes:

| Information | Purpose | Retention |
|:---|:---|:---|
| IP Address | Rate limiting, DDoS protection | Max 24 hours (rolling window) |
| User-Agent | Client classification, debugging | Max 24 hours |
| Endpoint & timestamp | Load analysis | Max 7 days |
| HTTP Status Code | Error detection | Max 7 days |

These logs are **not shared** with third parties and are automatically deleted after the above period.

---

## 3. Data from Bot Scraping

The `VietFuelBot/1.0` bot collects data from public sources. We commit to:

- **No data collection** other than public fuel prices.
- **No authentication required**: The API is fully public.
- **Historical Storage**: Price data from adjustment periods is stored locally in D1/SQLite for statistical purposes; no user information is logged.
- **Not accessing** areas requiring authentication or not publicly available.
- **Respecting robots.txt** of source websites.

---

## 4. Browser-Side Storage

This website may store the following in your **browser** (localStorage) — nothing is sent back to our servers:

| localStorage Key | Content | Purpose |
|:---|:---|:---|
| `lang` | `"vi"` or `"en"` | Remember display language preference |

You can clear your browser's data manually in your browser's DevTools.

---

## 5. Third-Party Data Sharing

We **never** sell, rent, or share user information with third parties, except:

- Mandatory official requests from competent legal authorities under Vietnamese law.
- Situations requiring system protection against serious attacks (notified in advance where possible).

---

## 6. Legal Compliance

This policy complies with:
- **Decree 13/2023/ND-CP** on personal data protection in Vietnam.
- **Cybersecurity Law 2015**.

---

## 7. Privacy Contact

If you have questions or requests regarding privacy, please open an issue on GitHub: [github.com/TranQui004/vietfuel-api/issues](https://github.com/TranQui004/vietfuel-api/issues)

---

🔗 [Back to Legal Index](README.md) | [Tiếng Việt →](../../vi/legal/privacy.md)