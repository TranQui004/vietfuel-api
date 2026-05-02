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
 * playground-anim.js v6 — Full 6 Endpoints
 *
 * GET /api/health                           — BLOCK 0
 * GET /api/fuel-prices                      — BLOCK 1 (Default grouped)
 * GET /api/fuel-prices/comeco               — BLOCK 2 (Single source snapshot)
 * GET /api/fuel-prices/pvoil                — BLOCK 3 (Single source)
 * GET /api/provinces?region=1               — BLOCK 4 (Province list)
 * GET /api/fuel-prices/province/ho-chi-minh — BLOCK 5 (On-demand province)
 */

/* ── CONFIG ───────────────────────────────── */
const PC = { fast: 24, slow: 65, lineGap: 88 };

/* ── SPAN HELPERS ─────────────────────────── */
const sp = (c, t) => `<span class="${c}">${t}</span>`;
const K  = t => sp('pc-json-key',   '"' + t + '"');
const S  = t => sp('pc-json-str',   '"' + t + '"');
const N  = t => sp('pc-json-num',   t);
const B  = t => sp('pc-json-bool',  t);
const P  = t => sp('pc-json-punct', t);
const C  = t => sp('pc-json-comment', '// ' + t);
const row = html => ({ html });
const kv = (key, val, comma = true) =>
  row(`&nbsp;&nbsp;${K(key)}${P(': ')}${val}${comma ? P(',') : ''}`);
const kvi = (key, val, comma = true) =>     // indented (4 spaces)
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${K(key)}${P(': ')}${val}${comma ? P(',') : ''}`);

/* ── COMMANDS ─────────────────────────────── */
const CMDS = [
  /* 0 */ `curl -s "http://localhost:3000/api/health"`,
  /* 1 */ `curl -s "http://localhost:3000/api/fuel-prices" \\\n  -H "Accept: application/json"`,
  /* 2 */ `curl -s "http://localhost:3000/api/fuel-prices/comeco"`,
  /* 3 */ `curl -s "http://localhost:3000/api/fuel-prices/pvoil"`,
  /* 4 */ `curl -s "http://localhost:3000/api/provinces?region=1"`,
  /* 5 */ `curl -s "http://localhost:3000/api/fuel-prices/province/ho-chi-minh"`,
];

/* ── JSON BLOCKS ──────────────────────────── */
/* BLOCK 0 — /api/health */
const B0 = [
  row(`&nbsp;&nbsp;${K('success')}${P(': ')}${B('true')}${P(',')}`),
  row(`&nbsp;&nbsp;${K('status')}${P(': ')}${S('healthy')}${P(',')}`),
  row(`&nbsp;&nbsp;${K('sources')}${P(': {')} ${C('11 integrated sources active')} ${P('},')} `),
  row(`&nbsp;&nbsp;${K('endpoints')}${P(': {')} ${K('provinceCount')}${P(': ')}${N('63')}${P(', ')}${K('apiVersion')}${P(': ')}${S('2.0')} ${P('},')} `),
  row(`&nbsp;&nbsp;${K('timestamp')}${P(': ')}${S('2026-04-06T00:00:00.000Z')}`),
];

/* BLOCK 1 — /api/fuel-prices (Default grouped) */
const B1 = [
  kv('success',      B('true')),
  kv('status',       S('ok')),
  kv('meta', `${P('{')} ${K('primarySource')}${P(': ')}${S('Petrolimex')}${P(',')} ${K('dataSources')}${P(': ')}${P('[')}${S('petrolimex')}${P(', ')}${S('pvoil')}${P(', ')}${S('mipec')}${P(', ...')}${P(']')}${P(',')} ${K('totalItems')}${P(': ')}${N('7')} ${P('}')}`, true),
  kv('priceDate',    S('2026-04-06')),
  row(`&nbsp;&nbsp;${K('data')}${P(': [')} ${C('sorted by fuel type')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng RON 95-V')}${P(',')} ${K('region1')}${P(': ')}${N('22120')}${P(',')} ${K('region2')}${P(': ')}${N('22120')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng RON 95-III')}${P(',')} ${K('region1')}${P(': ')}${N('21250')}${P(',')} ${K('region2')}${P(': ')}${N('21140')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng E5 RON 92-II')}${P(',')} ${K('region1')}${P(': ')}${N('19943')}${P(',')} ${K('region2')}${P(': ')}${N('19840')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('DO 0,05S-II')}${P(',')} ${K('region1')}${P(': ')}${N('18840')}${P(',')} ${K('region2')}${P(': ')}${N('18740')} ${P('}')} `),
  row(`&nbsp;&nbsp;${P(']')}`),
];

/* BLOCK 2 — /api/fuel-prices/comeco */
const B2 = [
  kv('success',  B('true')),
  kv('status',   S('ok')),
  kv('meta', `${P('{')} ${K('source')}${P(': ')}${S('COMECO')}${P(',')} ${K('priceDate')}${P(': ')}${S('2026-04-09')}${P(',')} ${K('totalItems')}${P(': ')}${N('7')} ${P('}')}`, true),
  row(`&nbsp;&nbsp;${K('data')}${P(': [')}`),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng RON 95-V')}${P(',')} ${K('region1')}${P(': ')}${N('24730')}${P(',')} ${K('region2')}${P(': ')}${N('25220')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng E5 RON 92-II')}${P(',')} ${K('region1')}${P(': ')}${N('20610')}${P(',')} ${K('region2')}${P(': ')}${N('21020')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('DO 0,05S-II')}${P(',')} ${K('region1')}${P(': ')}${N('18510')}${P(',')} ${K('region2')}${P(': ')}${N('18880')} ${P('}')} `),
  row(`&nbsp;&nbsp;${P(']')}`),
];

/* BLOCK 3 — /api/fuel-prices/pvoil */
const B3 = [
  kv('success', B('true')),
  kv('status',  S('ok')),
  kv('meta', `${P('{')} ${K('source')}${P(': ')}${S('PVOil')}${P(',')} ${K('totalItems')}${P(': ')}${N('4')}${P(',')} ${K('cacheHit')}${P(': ')}${B('true')} ${P('}')}`, true),
  row(`&nbsp;&nbsp;${K('data')}${P(': [')}`),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng RON 95')}${P(',')} ${K('region1')}${P(': ')}${N('21200')}${P(',')} ${K('region2')}${P(': ')}${N('21090')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng E5 RON 92')}${P(',')} ${K('region1')}${P(': ')}${N('19890')}${P(',')} ${K('region2')}${P(': ')}${N('19790')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Dầu Diesel')}${P(',')} ${K('region1')}${P(': ')}${N('18790')}${P(',')} ${K('region2')}${P(': ')}${N('18690')} ${P('}')} `),
  row(`&nbsp;&nbsp;${P(']')}`),
];

/* BLOCK 4 — /api/provinces?region=1 */
const B4 = [
  kv('success', B('true')),
  kv('status',  S('ok')),
  kv('meta', `${P('{')} ${K('total')}${P(': ')}${N('48')}${P(',')} ${K('filterApplied')}${P(': ')}${S('region=1')} ${P('}')}`, true),
  row(`&nbsp;&nbsp;${K('data')}${P(': [')}`),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Hà Nội')}${P(',')} ${K('slug')}${P(': ')}${S('ha-noi')}${P(',')} ${K('region')}${P(': ')}${S('1')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('TP. Hồ Chí Minh')}${P(',')} ${K('slug')}${P(': ')}${S('ho-chi-minh')}${P(',')} ${K('region')}${P(': ')}${S('1')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Đà Nẵng')}${P(',')} ${K('slug')}${P(': ')}${S('da-nang')}${P(',')} ${K('region')}${P(': ')}${S('1')} ${P('}')}${P(', ...')} `),
  row(`&nbsp;&nbsp;${P(']')} ${C('48 tỉnh thành vùng 1')}`),
];

/* BLOCK 5 — /api/fuel-prices/province/ho-chi-minh */
const B5 = [
  kv('success',   B('true')),
  kv('status',    S('ok')),
  kv('meta', `${P('{')} ${K('province')}${P(': ')}${S('TP. Hồ Chí Minh')}${P(',')} ${K('slug')}${P(': ')}${S('ho-chi-minh')}${P(',')} ${K('region')}${P(': ')}${S('1')}${P(',')} ${K('source')}${P(': ')}${S('GiaXangHomNay')} ${P('}')}`, true),
  row(`&nbsp;&nbsp;${K('data')}${P(': [')}`),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng RON 95-V')}${P(',')} ${K('price')}${P(': ')}${N('22120')}${P(',')} ${K('unit')}${P(': ')}${S('VND/lít')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng RON 95-III')}${P(',')} ${K('price')}${P(': ')}${N('21250')}${P(',')} ${K('unit')}${P(': ')}${S('VND/lít')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('Xăng E5 RON 92-II')}${P(',')} ${K('price')}${P(': ')}${N('19943')}${P(',')} ${K('unit')}${P(': ')}${S('VND/lít')} ${P('},')} `),
  row(`&nbsp;&nbsp;&nbsp;&nbsp;${P('{')} ${K('name')}${P(': ')}${S('DO 0,05S-II')}${P(',')} ${K('price')}${P(': ')}${N('18840')}${P(',')} ${K('unit')}${P(': ')}${S('VND/lít')} ${P('}')} `),
  row(`&nbsp;&nbsp;${P(']')}`),
];

const ALL_BLOCKS = [B0, B1, B2, B3, B4, B5];

/* ── UTILS ────────────────────────────────── */
const delay = ms  => new Promise(r => setTimeout(r, ms));
const rand  = (a, b) => Math.random() * (b - a) + a;
const $     = id => document.getElementById(id);

function showEl(el, display = '') {
  if (!el) return;
  el.style.display = display || '';
  el.style.opacity = '1';
}
function showBlock(el) { showEl(el, 'block'); }
function showFlex(el)  { showEl(el, 'flex');  }
function hide(el)      { if (el) el.style.display = 'none'; }

async function type(el, text, signal) {
  if (!el) return;
  for (const ch of text) {
    if (signal?.aborted) return;
    el.textContent += ch;
    await delay(rand(PC.fast, PC.slow));
  }
}

async function renderBlock(container, lines, terminal, signal) {
  if (!container) return;
  container.innerHTML = '';
  showBlock(container);
  for (const item of lines) {
    if (signal?.aborted) return;
    const el = document.createElement('div');
    el.className = 'pc-json-row';
    el.style.cssText = 'opacity:0;transform:translateY(3px);transition:opacity 0.16s ease,transform 0.16s ease;';
    el.innerHTML = item.html;
    container.appendChild(el);
    void el.offsetWidth;
    el.style.opacity   = '1';
    el.style.transform = 'translateY(0)';
    scrollBottom(terminal);
    await delay(PC.lineGap);
  }
}

function scrollBottom(t) {
  if (t) t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' });
}

function setStatus(dot, txt, state, msg) {
  if (dot) dot.className   = 'pc-status-dot' + (state ? ' ' + state : '');
  if (txt) txt.textContent = msg;
}

function ripple(container, y, x) {
  const r = document.createElement('div');
  r.className = 'pc-click-ripple';
  r.style.top  = y + 'px';
  r.style.left = x + 'px';
  container.appendChild(r);
  setTimeout(() => r.remove(), 700);
}

/* ── MAIN ─────────────────────────────────── */
let _abort = null;

async function runAnimation() {
  if (_abort) _abort.abort();
  _abort = new AbortController();
  const sig = _abort.signal;

  const terminal = $('pcTerminal');
  const mockup   = terminal?.closest('.pc-mockup');
  const mouse    = $('pcMouse');
  const dot      = $('pcStatusDot');
  const txt      = $('pcStatusText');
  const replay   = $('pcReplayBtn');
  if (!terminal) return;

  /* ── RESET ─────────────────────────────── */
  for (let i = 0; i <= 5; i++) {
    const cmd = $('pcCmd'    + i); if (cmd) cmd.textContent = '';
    const cur = $('pcCursor' + i); if (cur) { cur.style.display = 'inline'; cur.style.opacity = '1'; }
    const jb  = $('pcJsonBlock' + i);
    if (jb) { jb.innerHTML = ''; jb.style.display = 'none'; }
    hide($('pcComment' + i));
    hide($('pcBrace'   + i + 'open'));
    hide($('pcBrace'   + i + 'close'));
    if (i > 0) hide($('pcLine' + i));
  }
  showEl($('pcLine0')); // Block 0 prompt always visible first
  hide($('pcDone'));
  if (mouse) { mouse.style.opacity = '0'; mouse.style.top = '8%'; mouse.style.left = '88%'; }
  terminal.scrollTop = 0;
  if (replay) replay.disabled = true;
  setStatus(dot, txt, '', 'Đang khởi động...');

  /* ── MOUSE ENTER ────────────────────────── */
  await delay(500);
  if (sig.aborted) return;
  if (mouse) {
    mouse.style.opacity = '1';
    await delay(180);
    mouse.style.top  = '14%';
    mouse.style.left = '82%';
    await delay(580);
    mouse.style.top  = '30%';
    mouse.style.left = '24%';
    await delay(560);
    if (mockup) {
      const mr = mockup.getBoundingClientRect();
      const tr = terminal.getBoundingClientRect();
      ripple(mockup, tr.top - mr.top + 26, tr.left - mr.left + 48);
    }
    mouse.style.transform = 'scale(0.8)';
    await delay(90);
    mouse.style.transform = 'scale(1)';
    await delay(360);
    mouse.style.opacity = '0';
  }
  if (sig.aborted) return;

  /* ── BLOCK RUNNER ────────────────────────── */
  async function runBlock(n, loadMsg, okMsg, hasBrace) {
    if (sig.aborted) return;
    if (n > 0) {
      showEl($('pcLine' + n));
      scrollBottom(terminal);
      await delay(180);
    }
    setStatus(dot, txt, 'loading', loadMsg);
    await type($('pcCmd' + n), CMDS[n], sig);
    if (sig.aborted) return;
    const cur = $('pcCursor' + n);
    if (cur) cur.style.display = 'none';
    await delay(240);

    // Fake latency dots
    const cmdEl = $('pcCmd' + n);
    for (let i = 0; i < 3; i++) {
      if (sig.aborted) return;
      if (cmdEl) cmdEl.textContent += '.';
      await delay(210);
    }

    showBlock($('pcComment' + n));
    scrollBottom(terminal);
    await delay(70);

    if (hasBrace) showBlock($('pcBrace' + n + 'open'));
    const jb = $('pcJsonBlock' + n);
    if (jb && ALL_BLOCKS[n]) await renderBlock(jb, ALL_BLOCKS[n], terminal, sig);
    if (sig.aborted) return;
    if (hasBrace) showBlock($('pcBrace' + n + 'close'));
    scrollBottom(terminal);
    await delay(260);
    setStatus(dot, txt, 'active', okMsg);
  }

  /* ── RUN ALL BLOCKS ──────────────────────── */
  const DEFS = [
    [0, 'GET /api/health...',                              '200 OK — status: healthy',             false],
    [1, 'GET /api/fuel-prices (Default)...',               '200 OK — grouped data, multi-source',  true],
    [2, 'GET /api/fuel-prices/comeco...',                  '200 OK — COMECO snapshot',              false],
    [3, 'GET /api/fuel-prices/pvoil...',                   '200 OK — PVOil: 4 sản phẩm',           true],
    [4, 'GET /api/provinces?region=1...',                  '200 OK — 48 tỉnh vùng 1',              false],
    [5, 'GET /api/fuel-prices/province/ho-chi-minh...',    '200 OK — TP.HCM, vùng 1: 4 sản phẩm', true],
  ];

  for (const [n, load, ok, brace] of DEFS) {
    if (sig.aborted) return;
    await runBlock(n, load, ok, brace);
    await delay(620);
  }

  /* ── DONE ────────────────────────────────── */
  if (sig.aborted) return;
  await delay(300);
  showFlex($('pcDone'));
  scrollBottom(terminal);
  setStatus(dot, txt, 'active', '✓ 6/6 endpoints — Session hoàn tất');
  await delay(350);
  if (replay) replay.disabled = false;
}

/* ── ENTRY ────────────────────────────────── */
// Expose globally so IntersectionObserver in endpoints.html can call it
window.runAnimation = runAnimation;

document.addEventListener('DOMContentLoaded', () => {
  // Auto-start only on standalone playground page (not endpoints.html which uses IO)
  // endpoints.html script handles the start via IntersectionObserver
  const btn = $('pcReplayBtn');
  if (btn) btn.addEventListener('click', () => { if (!btn.disabled) runAnimation(); });
});

