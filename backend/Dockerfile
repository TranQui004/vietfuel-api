# =============================================================================
# VietFuel API - Dockerfile (HTTP-first, Playwright-free)
#
# Không còn cần Playwright hay bất kỳ headless browser nào.
# Tất cả scrapers chạy bằng node-fetch + cheerio (HTTP thuần).
# Image nhẹ hơn rất nhiều — phù hợp deploy lên VPS nhỏ hoặc Cloudflare Workers.
# =============================================================================

FROM node:22-alpine

# Cài đặt timezone và locale tiếng Việt
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
    && echo "Asia/Ho_Chi_Minh" > /etc/timezone

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files trước (tận dụng Docker layer cache)
COPY backend/package*.json ./

# Cài đặt production dependencies (không cần playwright browsers)
RUN npm install --omit=dev

# Sao chép toàn bộ mã nguồn backend
COPY backend/ .

# Expose port (mặc định 3000)
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Chạy ứng dụng
CMD ["node", "index.js"]
