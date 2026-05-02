/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 * All rights reserved.
 * 
 * This source code is the intellectual property of TranQui.
 * Community contributions and pull requests are highly welcomed!
 */
'use strict';

/* ── CHUYỂN ĐỔI NGÔN NGỮ ─────────────────────────────────── */
const langToggle = document.getElementById('langToggle');
const langLabel = document.getElementById('langLabel');
let currentLang = localStorage.getItem('fuel-api-lang') || 'vi';

function applyLanguage(lang) {
  document.body.classList.add('lang-transitioning');
  
  setTimeout(() => {
    currentLang = lang;
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('fuel-api-lang', lang);

    // [I18N] Đổi nội dung cho tất cả phần tử có data-vi/data-en.
    document.querySelectorAll('[data-vi][data-en]').forEach((el) => {
      el.textContent = el.getAttribute(`data-${lang}`);
    });

    // [I18N] Cập nhật trạng thái nút chuyển ngôn ngữ.
    langLabel.textContent = lang === 'vi' ? 'EN' : 'VI';
    document.documentElement.setAttribute('lang', lang);

    // [I18N] Cập nhật tiêu đề bảng trong khu vực live.
    const liveTableHeaders = document.querySelectorAll('.live-table th[data-vi]');
    liveTableHeaders.forEach((th) => {
      th.textContent = th.getAttribute(`data-${lang}`);
    });
    
    // [I18N] Cập nhật các text meta liên quan live nếu có.
    const liveMetaText = document.getElementById('liveMetaText');
    if (liveMetaText && liveMetaText.textContent.includes('•')) {
      // [I18N] Đồng bộ nhãn nút retry cho ngôn ngữ hiện tại.
      const retryBtn = document.getElementById('retryBtn');
      if (retryBtn) retryBtn.textContent = lang === 'vi' ? 'Thử lại' : 'Retry';
    }

    setTimeout(() => {
      document.body.classList.remove('lang-transitioning');
    }, 50); // [UI] Delay nhỏ để DOM kịp render.
  }, 200); // [UI] Chờ hiệu ứng fade-out.
}

langToggle.addEventListener('click', () => {
  if (document.body.classList.contains('lang-transitioning')) return;
  applyLanguage(currentLang === 'vi' ? 'en' : 'vi');
});

// [KHỞI TẠO] Áp dụng ngôn ngữ khi tải trang (không animation).
currentLang = localStorage.getItem('fuel-api-lang') || 'vi';
document.documentElement.setAttribute('data-lang', currentLang);
document.querySelectorAll('[data-vi][data-en]').forEach(el => el.textContent = el.getAttribute(`data-${currentLang}`));
langLabel.textContent = currentLang === 'vi' ? 'EN' : 'VI';
const liveTableHeaders = document.querySelectorAll('.live-table th[data-vi]');
liveTableHeaders.forEach(th => th.textContent = th.getAttribute(`data-${currentLang}`));

/* ── NÚT SAO CHÉP ────────────────────────────────────────── */
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const targetId = btn.getAttribute('data-target');
    const target = document.getElementById(targetId);
    if (!target) return;

    const text = target.textContent;
    try {
      await navigator.clipboard.writeText(text.trim());
      const originalText = btn.textContent;
      btn.textContent = '✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = currentLang === 'vi' ? 'Sao chép' : 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    } catch (_) {
      // [FALLBACK] Dùng textarea khi clipboard API không khả dụng.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  });
});

/* ── TẢI DỮ LIỆU LIVE ────────────────────────────────────── */
const liveLoading = document.getElementById('liveLoading');
const liveError = document.getElementById('liveError');
const liveTable = document.getElementById('liveTable');
const liveTableBody = document.getElementById('liveTableBody');
const liveDot = document.querySelector('.live-dot');
const liveMetaText = document.getElementById('liveMetaText');
const retryBtn = document.getElementById('retryBtn');

function formatPrice(num) {
  if (!num) return '—';
  return num.toLocaleString('vi-VN') + ' ₫';
}

function getFuelClass(name) {
  const n = name.toLowerCase();
  if (n.includes('dầu hỏa') || n.includes('kero')) return 'kerosene';
  if (n.includes('do ') || n.includes('diesel') || n.includes('0,')) return 'diesel';
  return 'gasoline';
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(isoStr));
  } catch {
    return isoStr;
  }
}

async function fetchLiveData() {
  liveLoading.style.display = 'block';
  liveError.style.display = 'none';
  liveTable.style.display = 'none';
  liveDot.className = 'live-dot';

  const metaVi = 'Đang tải dữ liệu...';
  const metaEn = 'Fetching data...';
  liveMetaText.textContent = currentLang === 'vi' ? metaVi : metaEn;

  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'http://localhost:3000'; // [GHI CHÚ] Đổi sang domain production khi triển khai.

  try {
    const res = await fetch(`${API_BASE_URL}/api/fuel-prices`);
    const json = await res.json();

    liveLoading.style.display = 'none';

    if (!json.success || !json.data || json.data.length === 0) {
      throw new Error(json.message || 'No data');
    }

    // [BẢNG] Đổ dữ liệu vào bảng hiển thị.
    liveTableBody.innerHTML = '';
    json.data.forEach((item) => {
      const tr = document.createElement('tr');
      const fuelClass = getFuelClass(item.name);
      tr.innerHTML = `
        <td><span class="fuel-name ${fuelClass}">${item.name}</span></td>
        <td class="price-cell">${formatPrice(item.region1)}</td>
        <td class="price-cell price-region2">${formatPrice(item.region2)}</td>
      `;
      liveTableBody.appendChild(tr);
    });

    liveTable.style.display = 'table';
    liveDot.className = 'live-dot active';

    const scrapedAt = json.meta?.scrapedAt;
    const priceDate = json.meta?.priceDate;
    const total = json.meta?.totalItems || json.data.length;

    if (currentLang === 'vi') {
      liveMetaText.textContent = `${total} loại nhiên liệu • Ngày niêm yết: ${priceDate || '—'} • Cập nhật lần cuối: ${formatDate(scrapedAt)}`;
    } else {
      liveMetaText.textContent = `${total} fuel types • Price date: ${priceDate || '—'} • Last updated: ${formatDate(scrapedAt)}`;
    }

  } catch (err) {
    liveLoading.style.display = 'none';
    liveError.style.display = 'block';
    liveDot.className = 'live-dot error';

    if (currentLang === 'vi') {
      liveMetaText.textContent = 'Không thể tải dữ liệu.';
      document.getElementById('liveErrorMsg').textContent =
        'Không thể tải dữ liệu. Hãy đảm bảo server đang chạy trên cổng 3000.';
      retryBtn.textContent = 'Thử lại';
    } else {
      liveMetaText.textContent = 'Could not load data.';
      document.getElementById('liveErrorMsg').textContent =
        'Could not load data. Make sure the server is running on port 3000.';
      retryBtn.textContent = 'Retry';
    }
  }
}

retryBtn.addEventListener('click', fetchLiveData);

// [LAZY LOAD] Tải dữ liệu khi cuộn đến section #live.
const liveSection = document.getElementById('live');
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      fetchLiveData();
      observer.disconnect();
    }
  },
  { threshold: 0.1 }
);
observer.observe(liveSection);

// [I18N] Giữ tham chiếu để tương thích các đoạn script mở rộng.
const originalApply = applyLanguage;
// [I18N] Biến nền cho trường hợp cần mở rộng applyLanguage.
const _base = applyLanguage;
// [I18N] Duy trì vòng lặp đồng bộ nhãn nút copy.
document.querySelectorAll('.copy-btn').forEach((btn) => {
  // handled in toggle
});

