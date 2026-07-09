/* ==========================================================================
 * [SCHEMA] Lịch sử Giá Xăng Dầu
 * Cấu trúc bảng dùng chung cho Cloudflare D1 và SQLite.
 * ========================================================================== */

CREATE TABLE IF NOT EXISTS fuel_prices_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fuel_name TEXT NOT NULL,
    region_1 REAL,
    region_2 REAL,
    source TEXT,
    price_date TEXT,
    scraped_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_name ON fuel_prices_history (fuel_name);
CREATE INDEX IF NOT EXISTS idx_price_date ON fuel_prices_history (price_date);
CREATE INDEX IF NOT EXISTS idx_source ON fuel_prices_history (source);
