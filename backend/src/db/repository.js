/* ==========================================================================
 * [DATABASE] Lịch sử Giá (D1/SQLite)
 * Cung cấp các hàm tương tác với cơ sở dữ liệu lịch sử giá xăng dầu.
 * Tương thích ngược với cả Cloudflare D1 và better-sqlite3 local.
 * ========================================================================== */

/* ==========================================================================
 * [LƯU TRỮ] insertFuelPricesHistory
 * Lưu dữ liệu xăng dầu vào cơ sở dữ liệu lịch sử sau mỗi lần cào thành công.
 * ========================================================================== */
export async function insertFuelPricesHistory(db, sourceKey, data) {
  if (!db) {
    console.warn('[DB] Không tìm thấy DB binding (env.DB). Bỏ qua lưu lịch sử.');
    return false;
  }
  
  if (!data || !data.prices || data.prices.length === 0) return false;

  const priceDate = data.priceDate || null;
  const scrapedAt = data.scrapedAt || new Date().toISOString();
  
  // [BATCH] Sử dụng db.batch để tối ưu ghi nhiều dòng trên Cloudflare D1
  const statements = [];
  
  for (const item of data.prices) {
    // [RÀNG BUỘC] Tránh ghi đè hoặc tạo bản sao trùng lặp trong cùng một ngày
    const r1 = item.region1 || item.price || null;
    const r2 = item.region2 || null;
    statements.push(
      db.prepare(`
        INSERT INTO fuel_prices_history (fuel_name, region_1, region_2, source, price_date, scraped_at)
        SELECT ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM fuel_prices_history 
          WHERE fuel_name = ? AND source = ? AND price_date = ?
        )
      `).bind(
        item.name, 
        r1, 
        r2, 
        sourceKey, 
        priceDate, 
        scrapedAt,
        item.name, 
        sourceKey, 
        priceDate
      )
    );
  }

  try {
    if (db.batch) {
        // [D1] Hỗ trợ ghi hàng loạt
        await db.batch(statements);
    } else {
        // [FALLBACK] Cho môi trường Node.js (better-sqlite3)
        for (const stmt of statements) {
            await stmt.run();
        }
    }
    console.log(`[DB] Đã lưu lịch sử giá cho nguồn ${sourceKey}`);
    // Tự động dọn dẹp lịch sử cũ hơn 90 ngày để tránh đầy ổ đĩa
    pruneFuelPricesHistory(db, 90).catch(err => console.error('[DB] Lỗi dọn dẹp lịch sử:', err));
    return true;
  } catch (error) {
    console.error(`[DB] Lỗi lưu lịch sử giá cho nguồn ${sourceKey}:`, error);
    return false;
  }
}

/* ==========================================================================
 * [TRA CỨU] getFuelPriceHistory
 * Truy xuất lịch sử giá của một loại nhiên liệu cụ thể, sắp xếp theo ngày.
 * ========================================================================== */
export async function getFuelPriceHistory(db, fuelName, limit = 30) {
  if (!db) return [];
  
  try {
    const result = await db.prepare(`
      SELECT id, fuel_name, region_1 as region1, region_2 as region2, source, price_date, created_at 
      FROM fuel_prices_history
      WHERE fuel_name LIKE ?
      ORDER BY price_date DESC, created_at DESC
      LIMIT ?
    `).bind(`%${fuelName}%`, limit).all();
    
    // [COMPATIBILITY] .results cho Cloudflare D1, fallback cho local
    return result.results || result;
  } catch (error) {
    console.error(`[DB] Lỗi tra cứu lịch sử giá ${fuelName}:`, error);
    return [];
  }
}

/* ==========================================================================
 * [DỌN DẸP] pruneFuelPricesHistory
 * Tự động xóa các dữ liệu lịch sử giá đã quá cũ (ví dụ: > 90 ngày).
 * ========================================================================== */
export async function pruneFuelPricesHistory(db, maxAgeDays = 90) {
  if (!db) return false;
  
  try {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - maxAgeDays);
    const minDateStr = minDate.toISOString().slice(0, 10); // YYYY-MM-DD
    
    await db.prepare(`
      DELETE FROM fuel_prices_history 
      WHERE price_date < ?
    `).bind(minDateStr).run();
    
    console.log(`[DB] Đã dọn dẹp các bản ghi lịch sử trước ngày: ${minDateStr}`);
    return true;
  } catch (error) {
    console.error('[DB] Lỗi dọn dẹp lịch sử:', error);
    return false;
  }
}

