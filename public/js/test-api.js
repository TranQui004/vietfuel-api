/**
 * VietFuelAPI — API Playground JS
 * Custom API tester thay thế Swagger UI.
 */
'use strict';

/* ── Config ─────────────────────────────────────────── */
const BASE_URL = window.location.origin; // tự detect domain thực tế

const ENDPOINTS = {
  unified: {
    path: '/api/fuel-prices',
    desc_vi: 'Lấy giá xăng dầu tổng hợp từ tất cả 11 nguồn, chuẩn hóa về 1 schema duy nhất.',
    desc_en: 'Get unified fuel prices from all 11 sources, normalized to a single schema.',
    params: [],
  },
  petrolimex: {
    path: '/api/fuel-prices/petrolimex',
    desc_vi: 'Lấy giá xăng dầu từ Petrolimex (nguồn gốc: CMS REST API nội bộ).',
    desc_en: 'Get fuel prices from Petrolimex (source: internal CMS REST API).',
    params: [],
  },
  pvoil: {
    path: '/api/fuel-prices/pvoil',
    desc_vi: 'Lấy giá từ PVOil — bypass Cloudflare qua IP origin + header Host.',
    desc_en: 'Get prices from PVOil — bypass Cloudflare via origin IP + Host header.',
    params: [],
  },
  mipec: {
    path: '/api/fuel-prices/mipec',
    desc_vi: 'Lấy giá từ Mipec — parse HTML SSR từ mipecorp.com.vn.',
    desc_en: 'Get prices from Mipec — parse SSR HTML from mipecorp.com.vn.',
    params: [],
  },
  saigonpetro: {
    path: '/api/fuel-prices/saigonpetro',
    desc_vi: 'Lấy giá từ SaigonPetro — parse bảng giá từ API nội bộ của họ.',
    desc_en: 'Get prices from SaigonPetro — parse prices from their internal API.',
    params: [],
  },
  comeco: {
    path: '/api/fuel-prices/comeco',
    desc_vi: 'Lấy giá từ Comeco — parse HTML tĩnh từ comeco.com.vn.',
    desc_en: 'Get prices from Comeco — parse static HTML from comeco.com.vn.',
    params: [],
  },
  petrotimes: {
    path: '/api/fuel-prices/petrotimes',
    desc_vi: 'Lấy giá từ Petrotimes — parse HTML từ API get-petro nội bộ.',
    desc_en: 'Get prices from Petrotimes — parse HTML from internal get-petro API.',
    params: [],
  },
  province: {
    path: '/api/fuel-prices/province/:slug',
    desc_vi: 'Lấy giá xăng dầu theo tỉnh thành. Dữ liệu theo Vùng 1 hoặc Vùng 2.',
    desc_en: 'Get fuel prices by province. Data split by Region 1 or Region 2.',
    params: [
      {
        name: 'slug', label: ':slug', required: true,
        type: 'select',
        options: [
          'ha-noi','ho-chi-minh','da-nang','can-tho','hai-phong',
          'an-giang','ba-ria-vung-tau','bac-giang','bac-kan','bac-lieu',
          'bac-ninh','ben-tre','binh-dinh','binh-duong','binh-phuoc',
          'binh-thuan','ca-mau','cao-bang','dak-lak','dak-nong',
          'dien-bien','dong-nai','dong-thap','gia-lai','ha-giang',
          'ha-nam','ha-tinh','hai-duong','hau-giang','hoa-binh',
          'hung-yen','khanh-hoa','kien-giang','kon-tum','lai-chau',
          'lam-dong','lang-son','lao-cai','long-an','nam-dinh',
          'nghe-an','ninh-binh','ninh-thuan','phu-tho','phu-yen',
          'quang-binh','quang-nam','quang-ngai','quang-ninh','quang-tri',
          'soc-trang','son-la','tay-ninh','thai-binh','thai-nguyen',
          'thanh-hoa','thua-thien-hue','tien-giang','tra-vinh','tuyen-quang',
          'vinh-long','vinh-phuc','yen-bai',
        ],
        default: 'ha-noi',
      },
    ],
  },
  provinces: {
    path: '/api/provinces',
    desc_vi: 'Danh sách 63 tỉnh thành với thông tin vùng giá (Vùng 1 / Vùng 2).',
    desc_en: 'List of 63 provinces with price region info (Region 1 / Region 2).',
    params: [
      {
        name: 'region', label: '?region', required: false,
        type: 'select',
        options: ['(all)', '1', '2'],
        default: '(all)',
      },
    ],
  },
  health: {
    path: '/api/health',
    desc_vi: 'Kiểm tra trạng thái hoạt động của API. Trả về uptime và cache stats.',
    desc_en: 'Check API operational status. Returns uptime and cache stats.',
    params: [],
  },
  sources: {
    path: '/api/sources',
    desc_vi: 'Danh sách tất cả nguồn dữ liệu được hỗ trợ kèm thông tin chi tiết.',
    desc_en: 'List all supported data sources with detailed information.',
    params: [],
  },
};

/* ── DOM Refs ────────────────────────────────────────── */
const UI = {
  nav:          document.getElementById('pgEndpointNav'),
  urlInput:     document.getElementById('pgUrlInput'),
  sendBtn:      document.getElementById('pgSendBtn'),
  baseUrl:      document.getElementById('pgBaseUrl'),
  responseBody: document.getElementById('pgResponseBody'),
  responseMeta: document.getElementById('pgResponseMeta'),
  statusBadge:  document.getElementById('pgStatusBadge'),
  responseTime: document.getElementById('pgResponseTime'),
  responseSize: document.getElementById('pgResponseSize'),
  copyBtn:      document.getElementById('pgCopyBtn'),
  collapseBtn:  document.getElementById('pgCollapseBtn'),
  paramsPanel:  document.getElementById('pgParamsPanel'),
  paramsInner:  document.getElementById('pgParamsInner'),
  epInfoText:   document.getElementById('pgEpInfoText'),
  snipCurl:     document.getElementById('pgSnippetCurl'),
  snipJs:       document.getElementById('pgSnippetJs'),
  snipPython:   document.getElementById('pgSnippetPython'),
  snipCopyBtn:  document.getElementById('pgSnippetCopyBtn'),
  tabs:         document.querySelectorAll('.pg-tab'),
  epCount:      document.getElementById('pgEndpointCount'),
};

/* ── State ───────────────────────────────────────────── */
let currentEp    = 'unified';
let currentTab   = 'curl';
let lastResponse = null;

/* ── Init ────────────────────────────────────────────── */
function init() {
  UI.baseUrl.textContent = BASE_URL;
  UI.epCount.textContent = Object.keys(ENDPOINTS).length;

  UI.nav.querySelectorAll('.pg-ep-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { selectEndpoint(btn.dataset.ep); });
  });

  UI.sendBtn.addEventListener('click', sendRequest);
  UI.urlInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendRequest(); });

  UI.copyBtn.addEventListener('click', copyResponse);
  UI.collapseBtn.addEventListener('click', function() {
    if (lastResponse) renderJson(lastResponse);
  });

  UI.tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      UI.tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.pg-snippet-content').forEach(function(c) { c.classList.remove('active'); });
      document.getElementById('snippet-' + currentTab).classList.add('active');
    });
  });

  UI.snipCopyBtn.addEventListener('click', copySnippet);

  selectEndpoint('unified');
}

/* ── Select Endpoint ─────────────────────────────────── */
function selectEndpoint(epId) {
  if (!ENDPOINTS[epId]) return;
  currentEp = epId;
  var ep   = ENDPOINTS[epId];
  var lang = document.documentElement.getAttribute('data-lang') || 'vi';

  UI.nav.querySelectorAll('.pg-ep-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.ep === epId);
  });

  UI.urlInput.value = ep.path;
  UI.epInfoText.textContent = lang === 'vi' ? ep.desc_vi : ep.desc_en;

  renderParams(ep);
  updateSnippets(buildUrl(epId));
}

/* ── Build URL ───────────────────────────────────────── */
function buildUrl(epId) {
  var ep         = ENDPOINTS[epId];
  var path       = ep.path;
  var queryParts = [];

  ep.params.forEach(function(p) {
    var input = document.getElementById('pg-param-' + p.name);
    var val   = input ? input.value.trim() : p.default;

    if (path.indexOf(':' + p.name) !== -1) {
      path = path.replace(':' + p.name, encodeURIComponent(val || p.default));
    } else if (val && val !== '(all)') {
      queryParts.push(p.name + '=' + encodeURIComponent(val));
    }
  });

  return BASE_URL + path + (queryParts.length ? '?' + queryParts.join('&') : '');
}

/* ── Render Params ───────────────────────────────────── */
function renderParams(ep) {
  if (!ep.params.length) {
    UI.paramsPanel.style.display = 'none';
    return;
  }
  UI.paramsPanel.style.display = 'block';
  UI.paramsInner.innerHTML = ep.params.map(function(p) {
    if (p.type === 'select') {
      var opts = p.options.map(function(o) {
        return '<option value="' + o + '"' + (o === p.default ? ' selected' : '') + '>' + o + '</option>';
      }).join('');
      return '<div class="pg-param-row"><label class="pg-param-label" for="pg-param-' + p.name + '">' + p.label + (p.required ? '<span class="pg-required">*</span>' : '') + '</label><select class="pg-param-select" id="pg-param-' + p.name + '">' + opts + '</select></div>';
    }
    return '<div class="pg-param-row"><label class="pg-param-label" for="pg-param-' + p.name + '">' + p.label + (p.required ? '<span class="pg-required">*</span>' : '') + '</label><input class="pg-param-input" id="pg-param-' + p.name + '" type="text" value="' + (p.default || '') + '" placeholder="' + p.label + '" /></div>';
  }).join('');

  UI.paramsInner.querySelectorAll('select, input').forEach(function(el) {
    el.addEventListener('change', function() { updateSnippets(buildUrl(currentEp)); });
    el.addEventListener('input',  function() { updateSnippets(buildUrl(currentEp)); });
  });
}

/* ── Send Request ────────────────────────────────────── */
async function sendRequest() {
  var url = buildUrl(currentEp);

  UI.sendBtn.classList.add('loading');
  UI.sendBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg><span>Đang gửi…</span>';

  UI.responseBody.innerHTML = '<div class="pg-loading-state"><div class="pg-spinner"></div><span>Đang gọi <code>' + url + '</code>…</span></div>';
  UI.responseMeta.style.display = 'none';
  UI.copyBtn.style.display = 'none';
  UI.collapseBtn.style.display = 'none';

  var t0 = Date.now();
  try {
    var res  = await fetch(url, { headers: { Accept: 'application/json' } });
    var ms   = Date.now() - t0;
    var text = await res.text();
    var json = null;
    try { json = JSON.parse(text); } catch (e) { json = null; }
    var bytes = new TextEncoder().encode(text).length;
    showResponse(res.status, ms, bytes, json, text);
    lastResponse = json || text;
  } catch (err) {
    showError(err.message, Date.now() - t0);
    lastResponse = null;
  } finally {
    UI.sendBtn.classList.remove('loading');
    UI.sendBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span data-vi="Gửi" data-en="Send">Gửi</span>';
  }
}

/* ── Show Response ───────────────────────────────────── */
function showResponse(status, ms, bytes, json, rawText) {
  var isOk   = status >= 200 && status < 300;
  var isWarn = status >= 300 && status < 500;
  UI.statusBadge.textContent  = status + (isOk ? ' OK' : isWarn ? ' WARN' : ' ERROR');
  UI.statusBadge.className    = 'pg-status-badge ' + (isOk ? 'ok' : isWarn ? 'warn' : 'err');
  UI.responseTime.textContent = ms + 'ms';
  UI.responseSize.textContent = formatBytes(bytes);
  UI.responseMeta.style.display  = 'flex';
  UI.copyBtn.style.display       = '';
  UI.collapseBtn.style.display   = json ? '' : 'none';

  if (json !== null) {
    renderJson(json);
  } else {
    UI.responseBody.innerHTML = '<pre class="pg-json">' + escHtml(rawText) + '</pre>';
  }
}

function showError(msg, ms) {
  UI.statusBadge.textContent  = 'ERROR';
  UI.statusBadge.className    = 'pg-status-badge err';
  UI.responseTime.textContent = ms + 'ms';
  UI.responseMeta.style.display = 'flex';
  UI.responseBody.innerHTML = '<pre class="pg-json" style="color:var(--status-danger,#f87171)">' + escHtml(msg) + '</pre>';
}

/* ── JSON Renderer ───────────────────────────────────── */
function renderJson(data) {
  var raw = JSON.stringify(data, null, 2);
  UI.responseBody.innerHTML = '<div class="pg-json">' + syntaxHighlight(raw) + '</div>';
}

function syntaxHighlight(str) {
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return '<span class="jk">' + match + '</span>';
        return '<span class="js">' + match + '</span>';
      }
      if (/true|false/.test(match)) return '<span class="jb">' + match + '</span>';
      if (/null/.test(match))       return '<span class="jnl">' + match + '</span>';
      return '<span class="jn">' + match + '</span>';
    });
}

/* ── Copy ────────────────────────────────────────────── */
function copyResponse() {
  var text = typeof lastResponse === 'string' ? lastResponse : JSON.stringify(lastResponse, null, 2);
  navigator.clipboard.writeText(text).then(function() {
    UI.copyBtn.classList.add('copied');
    UI.copyBtn.querySelector('span').textContent = 'Đã copy!';
    setTimeout(function() {
      UI.copyBtn.classList.remove('copied');
      UI.copyBtn.querySelector('span').textContent = 'Copy';
    }, 2000);
  });
}

function copySnippet() {
  var el = document.querySelector('.pg-snippet-content.active pre');
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(function() {
    UI.snipCopyBtn.classList.add('copied');
    UI.snipCopyBtn.innerHTML = '&#10003; Copied!';
    setTimeout(function() {
      UI.snipCopyBtn.classList.remove('copied');
      UI.snipCopyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
    }, 2000);
  });
}

/* ── Code Snippets ───────────────────────────────────── */
function updateSnippets(url) {
  UI.snipCurl.textContent   = 'curl -X GET "' + url + '" \\\n  -H "Accept: application/json"';
  UI.snipJs.textContent     = 'const res = await fetch(\'' + url + '\', {\n  headers: { \'Accept\': \'application/json\' }\n});\nconst data = await res.json();\nconsole.log(data);';
  UI.snipPython.textContent = 'import httpx\n\nresp = httpx.get("' + url + '",\n    headers={"Accept": "application/json"})\ndata = resp.json()\nprint(data)';
}

/* ── Helpers ─────────────────────────────────────────── */
function formatBytes(b) {
  if (b < 1024)      return b + ' B';
  if (b < 1048576)   return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Boot ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
