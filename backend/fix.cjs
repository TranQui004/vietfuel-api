const fs = require('fs');
const path = require('path');

// Sửa fuel-helpers.js
const helpersPath = path.join(__dirname, 'src/utils/fuel-helpers.js');
let helpers = fs.readFileSync(helpersPath, 'utf8');
helpers = helpers.replace(/from '\.\.\/services\/cache\.js'/g, "from '../cache.js'");
fs.writeFileSync(helpersPath, helpers);

// Xóa import config và logger ở tất cả scrapers
const scrapersDir = path.join(__dirname, 'src/scrapers');
const files = fs.readdirSync(scrapersDir);

for (const file of files) {
  if (file.endsWith('.js')) {
    const p = path.join(scrapersDir, file);
    let code = fs.readFileSync(p, 'utf8');
    
    // Xóa import config
    code = code.replace(/import config from '.*?config\.js';\n/g, '');
    
    // Sửa các biến config.USER_AGENT thành chuỗi tĩnh
    code = code.replace(/config\.USER_AGENT/g, "'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'");
    
    // Sửa các lời gọi liên quan đến Playwright do config.PLAYWRIGHT_WS_ENDPOINT bị lỗi
    code = code.replace(/config\.PLAYWRIGHT_WS_ENDPOINT/g, 'null');
    
    fs.writeFileSync(p, code);
  }
}

// Tìm xem ở đâu còn import utils/logger.js và xóa đi
const srcDir = path.join(__dirname, 'src');
const allSrcFiles = fs.readdirSync(srcDir);
for (const file of allSrcFiles) {
  if (file.endsWith('.js')) {
    const p = path.join(srcDir, file);
    let code = fs.readFileSync(p, 'utf8');
    if (code.includes('logger.js')) {
      code = code.replace(/import .*?logger\.js';\n/g, '');
      fs.writeFileSync(p, code);
    }
  }
}
console.log('Đã cập nhật các import.');
