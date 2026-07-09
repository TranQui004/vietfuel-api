import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import workerExport, { app } from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ==========================================================================
 * [CACHE] MemoryKV
 * Mô phỏng lại API của Cloudflare KV cho môi trường Docker/Local.
 * Sử dụng file JSON cục bộ để lưu trữ và nạp lại khi khởi động.
 * ========================================================================== */
class MemoryKV {
  constructor(filePath) {
    this.filePath = filePath;
    this.cache = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        for (const [k, v] of Object.entries(data)) {
          // [VALIDATION] Bỏ qua các bản ghi đã hết hạn
          if (!v.expires || v.expires > Date.now()) {
            this.cache.set(k, v);
          }
        }
      }
    } catch (e) {
      console.error('[MemoryKV] Lỗi tải cache từ file:', e.message);
    }
  }

  save() {
    try {
      const data = {};
      for (const [k, v] of this.cache.entries()) {
        if (!v.expires || v.expires > Date.now()) {
          data[k] = v;
        }
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[MemoryKV] Lỗi lưu cache ra file:', e.message);
    }
  }

  async get(key, options = 'text') {
    const type = typeof options === 'object' ? options.type : options;
    const item = this.cache.get(key);
    if (!item) return null;
    
    // [VALIDATION] Xóa bản ghi nếu đã quá hạn
    if (item.expires && item.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    if (type === 'json') {
      try { return JSON.parse(item.value); } catch(e) { return null; }
    }
    return item.value;
  }

  async put(key, value, options = {}) {
    const expires = options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
    this.cache.set(key, { value: String(value), expires });
    this.save();
  }

  async delete(key) {
    this.cache.delete(key);
    this.save();
  }

  async list(options = {}) {
    const prefix = options.prefix || '';
    const keys = [];
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) {
        const item = this.cache.get(k);
        if (!item.expires || item.expires > Date.now()) {
          keys.push({ name: k });
        }
      }
    }
    return { keys, list_complete: true };
  }
}

// [DATABASE] Khởi tạo SQLite cho local environment
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'history.db');
const dbInstance = new Database(dbPath);

// Chạy schema SQL nếu bảng chưa được tạo
const schemaPath = path.join(__dirname, 'db', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  dbInstance.exec(schema);
  console.log('[NodeServer] Đã đồng bộ SQLite schema từ schema.sql');
} else {
  console.warn('[NodeServer] Không tìm thấy schema.sql tại:', schemaPath);
}

// [SERVER] Khởi tạo KV giả lập và tiêm vào context Hono
const kvStore = new MemoryKV(path.join(__dirname, '..', '..', 'cache.json'));

app.use('*', async (c, next) => {
  await next();
});

// [SERVER] Cấu hình thư mục tĩnh
const publicDir = path.relative(process.cwd(), path.resolve(__dirname, '..', '..', 'public')) || '.';
app.use('/*', serveStatic({ root: publicDir }));

const port = process.env.PORT || 3000;
console.log(`[NodeServer] Bắt đầu chạy ứng dụng tại http://localhost:${port}`);

serve({
  fetch: (request, env, executionCtx) => {
    const customEnv = {
      ...env,
      FUEL_CACHE: kvStore,
      DB: dbInstance
    };
    return app.fetch(request, customEnv, executionCtx);
  },
  port
});

/* ==========================================================================
 * [CRON] Giả lập bộ lập lịch Scheduled
 * Chu kỳ: 4 giờ/lần, tương thích cấu hình của Cloudflare Triggers.
 * ========================================================================== */
setInterval(async () => {
  console.log('[NodeServer] Kích hoạt tiến trình cào dữ liệu định kỳ...');
  if (workerExport.scheduled) {
    try {
      await workerExport.scheduled({}, { FUEL_CACHE: kvStore, DB: dbInstance }, {});
    } catch (e) {
      console.error('[NodeServer] Lỗi cron giả lập:', e);
    }
  }
}, 4 * 60 * 60 * 1000);
