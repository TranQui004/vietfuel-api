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

/**
 * [LIVE] Bộ xử lý giao diện theo dõi dữ liệu thời gian thực.
 * Gồm lưới thẻ nhiên liệu, thanh thống kê, đồng hồ tự làm mới và khối JSON thô.
 * Hỗ trợ 11 nguồn quốc gia và tra cứu theo 63 tỉnh/thành.
 */

// ── HẰNG SỐ ─────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const SOURCE_BRAND_META = {
  petrolimex: { label: 'Petrolimex', color: '#06b6d4' },
  pvoil: { label: 'PVOil', color: '#ef4444' },
  mipec: { label: 'Mipec', color: '#ec4899' },
  webgia: { label: 'WebGia', color: '#22c55e' },
  comeco: { label: 'COMECO', color: '#6366f1' },
  saigonpetro: { label: 'Saigon Petro', color: '#f59e0b' },
  petrotimes: { label: 'Petro Times', color: '#f97316' },
  giaxanghomnay: { label: 'GiaXangHomNay', color: '#a855f7' },
  kv2_petrolimex: { label: 'KV2 Petrolimex', color: '#0ea5e9' },
  saigon_petrolimex: { label: 'Saigon Petrolimex', color: '#14b8a6' },
  vungtau_petrolimex: { label: 'VungTau Petrolimex', color: '#84cc16' },
};
const SOURCE_ORDER = [
  'petrolimex',
  'kv2_petrolimex',
  'saigon_petrolimex',
  'vungtau_petrolimex',
  'pvoil',
  'mipec',
  'comeco',
  'saigonpetro',
  'petrotimes',
  'webgia',
  'giaxanghomnay',
];

/** [MAPPING] Ánh xạ tên nhiên liệu sang biểu tượng và kiểu badge. */
const FUEL_ICONS = [
  { match: /95-v/i,              icon: 'zap',      bg: 'rgba(99,102,241,0.12)', color: '#6366f1', label: 'Ron 95-V',   badgeBg: 'rgba(99,102,241,0.1)',  badgeColor: '#6366f1', group: 'gasoline' },
  { match: /95-iii|95 iii/i,     icon: 'circle',   bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Ron 95-III', badgeBg: 'rgba(59,130,246,0.1)',  badgeColor: '#3b82f6', group: 'gasoline' },
  { match: /e5|ron 92/i,         icon: 'leaf',     bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'E5 Ron 92',  badgeBg: 'rgba(34,197,94,0.1)',   badgeColor: '#22c55e', group: 'gasoline' },
  { match: /dầu diesel|diesel|DO 0|mazut|dầu FO/i, icon: 'truck', bg: 'rgba(234,179,8,0.12)', color: '#eab308', label: 'Diesel', badgeBg: 'rgba(234,179,8,0.1)', badgeColor: '#eab308', group: 'diesel' },
  { match: /dầu hỏa|kerosene/i,  icon: 'flame',    bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Dầu hỏa',    badgeBg: 'rgba(249,115,22,0.1)',  badgeColor: '#f97316', group: 'kerosene' },
];

/** [NHÓM NHIÊN LIỆU] Metadata hiển thị theo nhóm. */
const FUEL_GROUPS = {
  gasoline:  { label: 'Xăng',   icon: 'car',     order: 1 },
  diesel:    { label: 'Diesel', icon: 'truck',   order: 2 },
  kerosene:  { label: 'Dầu hỏa', icon: 'flame', order: 3 },
  other:     { label: 'Khác',   icon: 'droplets', order: 99 },
};

function getFuelMeta(name) {
  for (const f of FUEL_ICONS) {
    if (f.match.test(name)) return f;
  }
  return { icon: 'fuel', bg: 'rgba(255,99,0,0.1)', color: '#ff6300', label: 'Nhiên liệu', badgeBg: 'rgba(255,99,0,0.1)', badgeColor: '#ff6300', group: 'other' };
}

/**
 * Nhóm dữ liệu nhiên liệu theo loại (xăng / diesel / dầu hỏa / khác).
 * Giữ đúng thứ tự FUEL_ORDER để xăng luôn lên đầu.
 */
function groupFuelItems(data) {
  const groups = {};
  const FUEL_ORDER_KEYS = ['gasoline', 'diesel', 'kerosene'];

  // [KHỞI TẠO] Duy trì đúng thứ tự hiển thị nhóm.
  groups._orderedKeys = [];

  data.forEach((item) => {
    const meta = getFuelMeta(item.name);
    const groupKey = meta.group || 'other';

    if (!groups[groupKey]) {
      groups[groupKey] = [];
      groups._orderedKeys.push(groupKey);
    }
    groups[groupKey].push({ ...item, _meta: meta });
  });

  // [SẮP XẾP] Sắp xếp từng nhóm theo FUEL_ORDER.
  const ORDER_MAP = { 'xăng ron 95-v': 0, 'xăng ron 95-iii': 1, 'xăng e10 ron 95-iii': 1, 'xăng e5 ron 92-ii': 2, 'do 0,001s-v': 3, 'do 0,05s-ii': 4, 'dầu hỏa 2-k': 5 };
  Object.keys(groups).forEach((k) => {
    if (k === '_orderedKeys') return;
    groups[k].sort((a, b) => {
      const ia = ORDER_MAP[a.name?.toLowerCase()] ?? 99;
      const ib = ORDER_MAP[b.name?.toLowerCase()] ?? 99;
      return ia - ib;
    });
  });

  return groups;
}

function getSourceMeta(source) {
  return SOURCE_BRAND_META[source] || { label: source, color: '#a1a1aa' };
}

// ── HÀM ĐỊNH DẠNG ───────────────────────────────────────────────────────────

const formatPrice = (num) => {
  if (num == null || num === undefined) return '—';
  return num.toLocaleString('vi-VN') + '\u00A0đ';
};

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(isoStr));
  } catch { return isoStr; }
};

const formatTime = (isoStr) => {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(isoStr));
  } catch { return formatDate(isoStr); }
};

// ── THAM CHIẾU DOM ──────────────────────────────────────────────────────────

const UI = {
  text:                document.getElementById('liveStatusText'),
  badgeDot:            document.querySelector('.live-badge i[data-lucide]'),
  countdown:           document.getElementById('liveCountdown'),

  // [THANH THỐNG KÊ]
  statPriceDate:       document.getElementById('statPriceDate'),
  statUpdatedAt:       document.getElementById('statUpdatedAt'),
  statSources:         document.getElementById('statSources'),

  // [THẺ NHIÊN LIỆU]
  fuelCardsPanel:      document.getElementById('fuelCardsPanel'),
  fuelCardsGrid:       document.getElementById('fuelCardsGrid'),
  cardsError:          document.getElementById('cardsError'),
  cardsErrorText:      document.getElementById('cardsErrorText'),

  // [BẢNG SO SÁNH] Chỉ dùng cho chế độ unified.
  comparisonPanel:     document.getElementById('comparisonPanel'),
  table:               document.getElementById('liveTable'),
  header:              document.getElementById('tableHeader'),
  body:                document.getElementById('tableBody'),
  loader:              document.getElementById('loadingIndicator'),
  error:               document.getElementById('errorIndicator'),
  errorText:           document.getElementById('errorText'),

  // [TỈNH/THÀNH]
  provinceSelectorWrap: document.getElementById('provinceSelectorWrap'),
  provinceSelect:       document.getElementById('provinceSelect'),
  regionBadge:          document.getElementById('provinceRegionBadge'),

  // [JSON THÔ]
  rawAccordion:         document.getElementById('rawAccordion'),
  rawAccordionToggle:   document.getElementById('rawAccordionToggle'),
  rawJsonCode:          document.getElementById('rawJsonCode'),
};

// ── TRẠNG THÁI ──────────────────────────────────────────────────────────────

let currentSource   = 'unified';
let refreshTimer    = null;
let countdownTimer  = null;
let nextRefreshAt   = null;

// ── ĐẾM NGƯỢC TỰ LÀM MỚI ────────────────────────────────────────────────────

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  clearInterval(countdownTimer);

  nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;

  countdownTimer = setInterval(() => {
    const remaining = Math.max(0, nextRefreshAt - Date.now());
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (UI.countdown) {
      UI.countdown.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (remaining === 0) clearInterval(countdownTimer);
  }, 1000);

  refreshTimer = setTimeout(() => {
    fetchLiveData(currentSource, true);
  }, REFRESH_INTERVAL_MS);
}

// ── TẢI DANH SÁCH TỈNH/THÀNH ────────────────────────────────────────────────

async function loadProvinces() {
  try {
    const res  = await fetch('/api/provinces');
    const json = await res.json();
    if (!json.success || !json.data) return;

    json.data.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = `${p.name}  (Vùng ${p.region})`;
      opt.dataset.region = p.region;
      UI.provinceSelect.appendChild(opt);
    });

    UI.provinceSelect.addEventListener('change', () => {
      const opt = UI.provinceSelect.selectedOptions[0];
      if (!opt.value) return;
      const region = opt.dataset.region;
      UI.regionBadge.textContent = `Vùng ${region}`;
      UI.regionBadge.className = `province-region-badge region-${region}`;
      UI.regionBadge.style.display = 'inline-flex';
      fetchProvinceData(opt.value);
    });
  } catch (err) {
    console.error('[Live] Province load error:', err);
  }
}

// ── LẤY DỮ LIỆU NGUỒN QUỐC GIA ──────────────────────────────────────────────

async function fetchLiveData(source = currentSource, silent = false) {
  const lang = document.documentElement.getAttribute('data-lang') || 'vi';
  currentSource = source;

  if (source === 'province') return; // [LUỒNG RIÊNG] Được xử lý bởi fetchProvinceData.

  if (!silent) setLoading(lang);

  try {
    const endpoint = source === 'unified' ? '/api/fuel-prices' : `/api/fuel-prices/${source}`;
    const res  = await fetch(endpoint);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error(json.message?.[lang] || 'API Error');

    renderCards(source, json.data, lang, null, json.meta);
    if (source === 'unified') renderComparisonTable(json.data, lang);
    updateStats(json.meta, lang);
    updateStatusMeta(json.meta, lang);
    if (UI.rawJsonCode) UI.rawJsonCode.textContent = JSON.stringify(json, null, 2);
    setSuccess();
    scheduleRefresh();
  } catch (err) {
    setError(err.message, lang);
  }
}

// ── LẤY DỮ LIỆU THEO TỈNH ───────────────────────────────────────────────────

async function fetchProvinceData(slug) {
  const lang = document.documentElement.getAttribute('data-lang') || 'vi';
  setLoading(lang);

  try {
    const res  = await fetch(`/api/fuel-prices/province/${slug}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error(json.message?.[lang] || 'API Error');

    const region       = json.meta?.region;
    const provinceName = json.meta?.province;
    renderCards(`province-${region}`, json.data, lang, provinceName, json.meta);
    updateStats(json.meta, lang);
    updateStatusMeta(json.meta, lang);
    if (UI.rawJsonCode) UI.rawJsonCode.textContent = JSON.stringify(json, null, 2);
    setSuccess();
    scheduleRefresh();
  } catch (err) {
    setError(err.message, lang);
  }
}

// ── HIỂN THỊ THẺ NHIÊN LIỆU ─────────────────────────────────────────────────

/**
 * Tạo một card nhiên liệu đơn lẻ.
 * @param {object} item - Dữ liệu nhiên liệu từ API.
 * @param {object} meta - Metadata biểu tượng/labels.
 * @param {string} lang - Ngôn ngữ hiện tại ('vi'|'en').
 * @param {string|null} price1 - Giá Vùng 1.
 * @param {string|null} price2 - Giá Vùng 2 (null nếu là nguồn đơn giá).
 * @param {string|null} zoneLabel - Nhãn vùng (dùng cho card đơn giá).
 * @param {string} modeLabel - Nhãn chế độ hiển thị (chỉ dùng cho card đơn giá).
 * @returns {HTMLElement}
 */
function buildFuelCard(item, meta, lang, price1, price2, zoneLabel, modeLabel) {
  const card = document.createElement('div');
  card.className = 'fuel-card';
  const modeBadgeHtml = modeLabel ? `<span class="fuel-card-mode-badge">${modeLabel}</span>` : '';

  let pricesHtml = '';
  if (price2 !== null) {
    // Hai vùng giá: hiển thị song song Vùng 1 | Vùng 2
    pricesHtml = `
      <div class="fuel-card-region-row">
        <div class="fuel-region-col">
          <span class="fpr-zone" data-vi="Vùng 1" data-en="Region 1">Vùng 1</span>
          <span class="fpr-price fpr-price-r1">${formatPrice(price1)}</span>
        </div>
        <div class="fuel-region-divider"></div>
        <div class="fuel-region-col">
          <span class="fpr-zone" data-vi="Vùng 2" data-en="Region 2">Vùng 2</span>
          <span class="fpr-price fpr-price-r2">${formatPrice(price2)}</span>
        </div>
      </div>`;
  } else {
    // [ĐƠN GIÁ] Chỉ có một mức giá, hiển thị trung tâm.
    pricesHtml = `
      <div class="fuel-card-single-price">
        <span class="fpr-zone">${zoneLabel}</span>
        <span class="fpr-price fpr-price-single">${formatPrice(price1)}</span>
      </div>`;
  }

  card.innerHTML = `
    <div class="fuel-card-top">
      <div class="fuel-icon" style="background:${meta.bg}; color:${meta.color};">
        <i data-lucide="${meta.icon}" width="16" height="16"></i>
      </div>
      <div class="fuel-card-header-right">
        <span class="fuel-type-badge" style="background:${meta.badgeBg}; color:${meta.badgeColor}; border:1px solid ${meta.badgeColor}33;">${meta.label}</span>
        ${modeBadgeHtml}
        <span class="fuel-card-source-dot" style="background:${meta.color};"></span>
      </div>
    </div>
    <div class="fuel-card-name">${item.name}</div>
    <div class="fuel-card-prices">${pricesHtml}</div>`;

  return card;
}

function pickUnifiedSourcePrice(item, preferredSource) {
  const allSources = item.sources || [];
  if (!allSources.length) return { region1: null, region2: null, price: null };

  if (preferredSource) {
    const preferred = allSources.find((s) => s.source === preferredSource);
    if (preferred) return preferred;
  }

  const ranked = [...allSources].sort((a, b) => {
    const ai = SOURCE_ORDER.indexOf(a.source);
    const bi = SOURCE_ORDER.indexOf(b.source);
    if (ai === -1 && bi === -1) return String(a.source || '').localeCompare(String(b.source || ''));
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return ranked[0];
}



function renderCards(source, data, lang, locationLabel, meta) {
  const grid = UI.fuelCardsGrid;
  grid.innerHTML = '';

  // [UI] Ẩn bảng so sánh khi xem nguồn đơn lẻ để tập trung vào thẻ.
  UI.comparisonPanel.style.display = source === 'unified' ? '' : 'none';

  const multiRegion = ['unified', 'petrolimex', 'mipec', 'webgia', 'giaxanghomnay', 'petrotimes'].includes(source);
  const isProvR1    = source === 'province-1';
  const isProvR2    = source === 'province-2';
  const preferredUnifiedSource = meta?.primarySourceId || null;

  const cardsPanelTitle = document.getElementById('cardsPanelTitle');
  if (cardsPanelTitle) {
    if (locationLabel) {
      cardsPanelTitle.textContent = lang === 'vi' ? `Giá tại ${locationLabel}` : `Prices in ${locationLabel}`;
    } else {
      cardsPanelTitle.setAttribute('data-vi', 'Giá xăng dầu');
      cardsPanelTitle.setAttribute('data-en', 'Fuel Prices');
      cardsPanelTitle.textContent = lang === 'vi' ? 'Giá xăng dầu' : 'Fuel Prices';
    }
  }

  UI.cardsError.style.display = 'none';

  // ── Nhóm theo loại nhiên liệu ───────────────────────────────
  const groups = groupFuelItems(data);

  (groups._orderedKeys || Object.keys(groups).filter(k => k !== '_orderedKeys')).forEach((groupKey) => {
    if (groupKey === '_orderedKeys') return;
    const items = groups[groupKey];
    if (!items || !items.length) return;

    const groupMeta = FUEL_GROUPS[groupKey] || FUEL_GROUPS.other;

    // [NHÓM] Tiêu đề nhóm nhiên liệu.
    const groupHeader = document.createElement('div');
    groupHeader.className = 'fuel-group-header';
    groupHeader.innerHTML = `
      <i data-lucide="${groupMeta.icon}" width="14" height="14"></i>
      <span class="fuel-group-label">${groupMeta.label}</span>
      <span class="fuel-group-count">${items.length}</span>`;
    grid.appendChild(groupHeader);

    const cardsInner = document.createElement('div');
    cardsInner.className = 'fuel-cards-inner';

    // [NHÓM] Danh sách thẻ của nhóm hiện tại.
    items.forEach(({ _meta, ...item }, idx) => {
      let price1 = null, price2 = null;
      let forceSinglePrice = false;

      if (multiRegion) {
        if (source === 'unified' && item.sources?.length) {
          const selectedSourceData = pickUnifiedSourcePrice(item, preferredUnifiedSource);
          const hasRegionData = selectedSourceData?.region1 != null || selectedSourceData?.region2 != null;
          if (hasRegionData) {
            price1 = selectedSourceData?.region1;
            price2 = selectedSourceData?.region2;
          } else {
            // [ĐƠN GIÁ] Một số nguồn (ví dụ PVOIL) chỉ có trường `price`.
            price1 = selectedSourceData?.price ?? null;
            price2 = null;
            forceSinglePrice = true;
          }
        } else {
          price1 = item.region1;
          price2 = item.region2;
        }
      } else if (isProvR1) {
        price1 = item.region1;
        price2 = null;
      } else if (isProvR2) {
        price1 = item.region2;
        price2 = null;
      } else {
        price1 = item.price;
        price2 = null;
      }

      const zoneLabel = isProvR1 ? (lang === 'vi' ? 'Vùng 1' : 'Region 1')
                       : isProvR2 ? (lang === 'vi' ? 'Vùng 2' : 'Region 2')
                       : forceSinglePrice ? (lang === 'vi' ? 'Giá bán' : 'Price')
                       : (lang === 'vi' ? 'Giá bán' : 'Price');

      const modeLabel = price2 !== null ? '' : (lang === 'vi' ? 'Đơn giá' : 'Single');

      const card = buildFuelCard(item, _meta, lang, price1, price2, zoneLabel, modeLabel);
      card.style.animationDelay = `${idx * 0.05}s`;
      cardsInner.appendChild(card);
    });

    grid.appendChild(cardsInner);
  });

  refreshLucideIcons();

}

// ── HIỂN THỊ BẢNG SO SÁNH (CHỈ CHO UNIFIED) ────────────────────────────────

function renderComparisonTable(data, lang) {
  UI.header.innerHTML = '';
  UI.body.innerHTML   = '';
  if (UI.table) delete UI.table.dataset.colHoverBound;
  UI.loader.style.display = 'none';
  UI.error.style.display  = 'none';
  if (UI.table) UI.table.style.opacity = '1';

  // [CỘT NGUỒN] Thu thập danh sách nguồn không trùng lặp.
  const sourceNames = new Set();
  data.forEach((item) => {
    (item.sources || []).forEach((s) => {
      if (s.source) sourceNames.add(s.source);
    });
  });
  const sources = [...sourceNames].sort((a, b) => {
    const ai = SOURCE_ORDER.indexOf(a);
    const bi = SOURCE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // [HEADER] Dựng tiêu đề cột.
  const thProduct = document.createElement('th');
  thProduct.setAttribute('data-vi', 'Sản phẩm');
  thProduct.setAttribute('data-en', 'Product');
  thProduct.textContent = lang === 'vi' ? 'Sản phẩm' : 'Product';
  UI.header.appendChild(thProduct);

  sources.forEach((src) => {
    const meta = getSourceMeta(src);
    const th = document.createElement('th');
    th.dataset.source = src;
    th.tabIndex = 0;
    th.innerHTML = `
      <span class="source-col-header">
        <span class="source-col-dot" style="--source-color:${meta.color};"></span>
        <span class="source-col-label">${meta.label}</span>
      </span>`;
    th.style.textAlign = 'right';
    UI.header.appendChild(th);
  });

  if (sources.length === 0) {
    // [FALLBACK] Không có nguồn thì hiển thị cột Vùng 1/Vùng 2.
    ['Vùng 1', 'Vùng 2'].forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      th.style.textAlign = 'right';
      UI.header.appendChild(th);
    });
  }

  // [ROWS] Dựng từng dòng dữ liệu.
  data.forEach((item) => {
    const tr = document.createElement('tr');
    const meta = getFuelMeta(item.name);

    const tdName = document.createElement('td');
    tdName.innerHTML = `<span class="fuel-name"><span class="fuel-name-icon"><i data-lucide="${meta.icon}" width="14" height="14"></i></span>${item.name}</span>`;
    tr.appendChild(tdName);

    if (sources.length > 0) {
      sources.forEach((srcName) => {
        const td   = document.createElement('td');
        td.className = 'price-cell';
        td.dataset.source = srcName;
        td.style.textAlign = 'right';
        const srcData = (item.sources || []).find((s) => s.source === srcName);
        const val = srcData ? (srcData.region1 ?? srcData.region2 ?? srcData.price) : null;
        td.textContent = formatPrice(val);
        tr.appendChild(td);
      });
    } else {
      [item.region1, item.region2].forEach((v) => {
        const td = document.createElement('td');
        td.className = 'price-cell';
        td.style.textAlign = 'right';
        td.textContent = formatPrice(v);
        tr.appendChild(td);
      });
    }

    UI.body.appendChild(tr);
  });
  refreshLucideIcons();
  setupComparisonColumnHover();
}

function setupComparisonColumnHover() {
  if (!UI.table) return;
  if (UI.table.dataset.colHoverBound === '1') return;
  UI.table.dataset.colHoverBound = '1';

  const clearFocus = () => {
    UI.table.querySelectorAll('.is-col-focus, .is-col-hidden').forEach((el) => {
      el.classList.remove('is-col-focus', 'is-col-hidden');
    });
  };

  const setFocus = (source) => {
    clearFocus();
    if (!source) return;
    UI.table.querySelectorAll(`[data-source="${source}"]`).forEach((el) => {
      el.classList.add('is-col-focus');
    });
    UI.table.querySelectorAll('[data-source]').forEach((el) => {
      if (el.dataset.source !== source) {
        el.classList.add('is-col-hidden');
      }
    });
  };

  UI.table.querySelectorAll('th[data-source]').forEach((th) => {
    const source = th.dataset.source;
    th.addEventListener('mouseenter', () => setFocus(source));
    th.addEventListener('mouseleave', clearFocus);
    th.addEventListener('focus', () => setFocus(source));
    th.addEventListener('blur', clearFocus);
  });
}

function refreshLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ── CẬP NHẬT THANH THỐNG KÊ ─────────────────────────────────────────────────

function updateStats(meta, lang) {
  if (!meta) return;

  const { priceDateDisplay, priceDate, scrapedAt, dataSources, sourceCount } = meta;
  const displayDate = priceDateDisplay || (priceDate ? formatDate(priceDate) : '—');

  if (UI.statPriceDate) UI.statPriceDate.textContent = displayDate;
  if (UI.statUpdatedAt) {
    UI.statUpdatedAt.textContent = scrapedAt ? formatTime(scrapedAt) : '—';
  }
  // [SỐ NGUỒN] Hiển thị sourceCount hoặc suy ra theo ngữ cảnh hiện tại.
  if (UI.statSources) {
    const srcCount = sourceCount
      ?? (Array.isArray(dataSources) ? dataSources.length : (currentSource === 'unified' ? 11 : 1));
    UI.statSources.textContent = srcCount;
  }
}

// ── CẬP NHẬT THANH TRẠNG THÁI ───────────────────────────────────────────────

function updateStatusMeta(meta, lang) {
  if (!meta) return;
  const {
    totalItems,
    priceDateDisplay,
    priceDate,
    scrapedAt,
    sourceUrl,
    primarySourceUrl,
    source,
    primarySource,
    province,
    isStale,
  } = meta;

  // [BADGE] Cập nhật biểu tượng trạng thái sau khi dọn icon cũ do Lucide render.
  const badge = document.querySelector('.live-badge');
  if (badge) {
    const iconName  = isStale ? 'alert-triangle' : 'activity';
    const iconColor = isStale ? 'var(--status-warn)' : 'var(--status-live)';

    // [DỌN ICON] Xóa cả <i data-lucide> và <svg> đã render để tránh chồng lớp.
    badge.querySelectorAll('i[data-lucide], svg.lucide').forEach((el) => el.remove());

    const iconEl = document.createElement('i');
    iconEl.setAttribute('data-lucide', iconName);
    iconEl.setAttribute('width', '16');
    iconEl.setAttribute('height', '16');
    iconEl.style.color = iconColor;
    badge.insertBefore(iconEl, badge.firstChild);
    UI.badgeDot = iconEl;
    refreshLucideIcons();
  }

  const displayDate  = priceDateDisplay || (priceDate ? formatDate(priceDate) : null);
  const locationPart = province ? ` · ${province}` : '';
  const effectiveSourceUrl = primarySourceUrl || sourceUrl;
  const effectiveSourceName = primarySource || source;
  const sourcePart   = effectiveSourceUrl
    ? ` · <a href="${effectiveSourceUrl}" target="_blank" rel="noopener" class="meta-source-link">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>${lang === 'vi' ? `Nguồn: ${effectiveSourceName || '—'}` : `Source: ${effectiveSourceName || '—'}`}</a>` : '';

  const stalePart = isStale ? (lang === 'vi' ? ' <span style="color:var(--status-warn); font-weight: 500;">[Cache Cũ - Lỗi Kết Nối Nguồn]</span>' : ' <span style="color:var(--status-warn); font-weight: 500;">[Stale Cache]</span>') : '';

  if (UI.text) {
    if (lang === 'vi') {
      UI.text.innerHTML = `${totalItems} sản phẩm${locationPart} · Niêm yết: ${displayDate || '—'} · Cập nhật: ${formatDate(scrapedAt)}${sourcePart}${stalePart}`;
    } else {
      UI.text.innerHTML = `${totalItems} products${locationPart} · Price date: ${displayDate || '—'} · Updated: ${formatDate(scrapedAt)}${sourcePart}${stalePart}`;
    }
  }
}

// ── HÀM HỖ TRỢ TRẠNG THÁI ───────────────────────────────────────────────────

function setLoading(lang) {
  if (UI.cardsError) UI.cardsError.style.display  = 'none';
  if (UI.error)      UI.error.style.display        = 'none';
  if (UI.loader)     UI.loader.style.display       = 'flex';
  if (UI.table)  UI.table.style.opacity = '0.3';
  if (UI.badgeDot) UI.badgeDot.style.color = 'var(--status-warn)';
  if (UI.text) UI.text.textContent = lang === 'vi' ? 'Đang kết nối API...' : 'Connecting to API...';

  // [SKELETON] Hiển thị skeleton theo đúng cấu trúc nhóm như dữ liệu thật.
  const SKELETON_GROUPS = [
    { label: 'Xăng',     count: 4 },
    { label: 'Diesel',   count: 2 },
    { label: 'Dầu hỏa',  count: 1 },
  ];
  const skeletonHtml = SKELETON_GROUPS.map(({ label, count }) => `
    <div class="fuel-group-header" aria-hidden="true">
      <span class="fuel-group-label">${label}</span>
      <span class="fuel-group-count">${count}</span>
    </div>
    <div class="fuel-cards-inner">
      ${Array.from({ length: count }).map(() =>
        '<div class="fuel-card-skeleton"></div>'
      ).join('')}
    </div>
  `).join('');
  if (UI.fuelCardsGrid) UI.fuelCardsGrid.innerHTML = skeletonHtml;
}

function setSuccess() {
  UI.loader.style.display = 'none';
  UI.error.style.display  = 'none';
  if (UI.table) UI.table.style.opacity = '1';
  if (UI.badgeDot) UI.badgeDot.style.color = 'var(--status-ok)';
}

function setError(msg, lang) {
  if (UI.loader)     UI.loader.style.display     = 'none';
  if (UI.cardsError) UI.cardsError.style.display = 'flex';
  if (UI.error)      UI.error.style.display      = 'flex';
  if (UI.fuelCardsGrid) UI.fuelCardsGrid.innerHTML = '';
  if (UI.badgeDot)   UI.badgeDot.style.color     = 'var(--status-error)';
  const txt = lang === 'vi' ? 'Lỗi đồng bộ dữ liệu.' : 'Sync error.';
  if (UI.text)          UI.text.textContent        = txt;
  if (UI.cardsErrorText) UI.cardsErrorText.textContent = msg;
  if (UI.errorText)     UI.errorText.textContent      = msg;
}

// ── CHUYỂN TAB NGUỒN DỮ LIỆU ────────────────────────────────────────────────

function initTabSwitching() {
  document.querySelectorAll('.source-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const source = btn.getAttribute('data-source');
      document.querySelectorAll('.source-tab-btn').forEach((b) => {
        b.classList.remove('source-tab-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('source-tab-active');
      btn.setAttribute('aria-selected', 'true');

      if (source === 'province') {
        if (UI.provinceSelectorWrap) UI.provinceSelectorWrap.style.display = 'flex';
        if (UI.comparisonPanel) UI.comparisonPanel.style.display = 'none';
        if (UI.fuelCardsGrid) UI.fuelCardsGrid.innerHTML = '';
        if (UI.cardsError) UI.cardsError.style.display = 'none';
        if (UI.loader) UI.loader.style.display = 'none';
        const lang = document.documentElement.getAttribute('data-lang') || 'vi';
        if (UI.badgeDot) UI.badgeDot.style.color = 'var(--status-ok)';
        if (UI.text) {
          UI.text.textContent = lang === 'vi'
            ? 'Chọn tỉnh/thành để xem giá tương ứng.'
            : 'Select a province to view fuel prices.';
        }
        currentSource = 'province';
        clearTimeout(refreshTimer);
        clearInterval(countdownTimer);
        if (UI.countdown) UI.countdown.textContent = '—';
      } else {
        if (UI.provinceSelectorWrap) UI.provinceSelectorWrap.style.display = 'none';
        if (UI.provinceSelect) UI.provinceSelect.value = '';
        if (UI.regionBadge) UI.regionBadge.style.display = 'none';
        fetchLiveData(source);
      }
    });
  });
}

// ── ACCORDION JSON THÔ ──────────────────────────────────────────────────────

if (UI.rawAccordionToggle) {
  UI.rawAccordionToggle.addEventListener('click', () => {
    UI.rawAccordion.classList.toggle('open');
    const expanded = UI.rawAccordion.classList.contains('open');
    UI.rawAccordionToggle.setAttribute('aria-expanded', String(expanded));
  });
  UI.rawAccordionToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.rawAccordionToggle.click(); }
  });
}

// [SAO CHÉP] Nút copy nội dung JSON trong accordion.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  if (!btn.dataset.defaultLabel) {
    btn.dataset.defaultLabel = btn.textContent.trim() || 'Copy';
  }
  const targetId = btn.getAttribute('data-target');
  const el = targetId ? document.getElementById(targetId) : null;
  const text = el?.textContent || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const copiedLabel = btn.getAttribute('data-copied') || 'Copied';
    btn.textContent = copiedLabel;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = btn.dataset.defaultLabel || 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
});

// ── KHỞI TẠO ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initTabSwitching();

  await loadProvinces();
  fetchLiveData('unified');
});

// [GLOBAL] Expose hàm retry cho các nút gọi inline.
window.fetchLiveData = fetchLiveData;

