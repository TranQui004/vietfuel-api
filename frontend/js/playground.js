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
 * playground.js — Hệ thống Mô phỏng Tích hợp VietFuelAPI
 * Quản lý: Flow diagram, System Log, Code snippet selector
 * Animation PC được xử lý bởi playground-anim.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const sourceSelect = document.getElementById('sourceSelect');
    const codeSnippet  = document.getElementById('codeSnippet');
    const logArea      = document.getElementById('logArea');
    const progress     = document.getElementById('flowProgress');
    const step3Label   = document.getElementById('step3Label');

    const steps = [1, 2, 3, 4].map(i => document.getElementById(`step${i}`));

    const sourceNames = {
      unified:       'Default Endpoint (Tất cả nguồn)',
        petrolimex:    'Petrolimex',
        pvoil:         'PVOil',
        mipec:         'Mipec',
        webgia:        'WebGia',
        giaxanghomnay: 'GiaXangHomNay',
    };

    const sourceSnippets = {
        unified:
`async function getFuelPrices() {
  const res  = await fetch('/api/fuel-prices');
  const data = await res.json();

  if (data.success) {
    renderUI(data.data);
  }
}`,
        petrolimex:
`async function getFuelPrices() {
  const res  = await fetch('/api/fuel-prices/petrolimex');
  const data = await res.json();

  if (data.success) {
    renderUI(data.data[0].items);
  }
}`,
        pvoil:
`async function getFuelPrices() {
  const res  = await fetch('/api/fuel-prices/pvoil');
  const data = await res.json();

  if (data.success) {
    renderUI(data.data[0].items);
  }
}`,
        mipec:
`async function getFuelPrices() {
  const res  = await fetch('/api/fuel-prices/mipec');
  const data = await res.json();

  if (data.success) {
    renderUI(data.data[0].items);
  }
}`,
        webgia:
`async function getFuelPrices() {
  /* WebGia — Mirror của Petrolimex */
  const res  = await fetch('/api/fuel-prices/webgia');
  const data = await res.json();

  if (data.success) {
    renderUI(data.data[0].items);
  }
}`,
        giaxanghomnay:
`async function getFuelPrices() {
  const res  = await fetch('/api/fuel-prices/giaxanghomnay');
  const data = await res.json();

  if (data.success) {
    renderUI(data.data[0].items);
  }
}`,
    };

    // ── Khởi tạo log đầu tiên ────────────────────────────────────────────
    addLog('Hệ thống sẵn sàng. Animation đang khởi động...', 'info');

    // ── Cập nhật snippet khi đổi nguồn ──────────────────────────────────
    sourceSelect?.addEventListener('change', () => {
        const src  = sourceSelect.value;
        const name = sourceNames[src] || src;
        if (step3Label) step3Label.textContent = name.split(' ')[0]; // Tên ngắn

        if (codeSnippet && sourceSnippets[src]) {
            codeSnippet.textContent = sourceSnippets[src];
        }
        addLog(`Đã chuyển nguồn: ${name}`, 'info');
    });

    // ── Lắng nghe sự kiện từ animation controller ───────────────────────
    document.addEventListener('pg:api-call', (e) => {
        const src = e.detail?.source || 'unified';
        resetFlow();
        addLog(`[${timestamp()}] Gửi request tới VietFuelAPI...`, 'cmd');

        activateStep(0, 25);
        setTimeout(() => {
            activateStep(1, 55);
            addLog(`[${timestamp()}] VietFuelAPI đang xử lý...`, 'info');
        }, 420);
        setTimeout(() => {
            activateStep(2, 78);
            addLog(`[${timestamp()}] Scraper thu thập dữ liệu thực...`, 'info');
        }, 840);
        setTimeout(() => {
            activateStep(3, 100);
            addLog(`[${timestamp()}] Phản hồi nhận thành công.`, 'success');
        }, 1260);
    });

    // ── Helpers ──────────────────────────────────────────────────────────
    function activateStep(index, pct) {
        steps.forEach((s, i) => s?.classList.toggle('active', i <= index));
        if (progress) progress.style.width = `${pct}%`;
    }

    function resetFlow() {
        steps.forEach(s => s?.classList.remove('active'));
        if (progress) {
            progress.style.width     = '0%';
            progress.style.background = 'var(--accent)';
        }
    }

    function addLog(msg, type = 'info') {
        const colorMap = {
            error:   '#f87171',
            success: '#4ade80',
            cmd:     '#60a5fa',
            info:    '#a1a1aa',
        };
        const div       = document.createElement('div');
        div.className   = 'pg-log-line';
        div.style.color = colorMap[type] ?? colorMap.info;
        div.textContent = `> ${msg}`;
        logArea?.appendChild(div);
        if (logArea) logArea.scrollTop = logArea.scrollHeight;
        while (logArea && logArea.children.length > 7) logArea.removeChild(logArea.firstChild);
    }

    function timestamp() {
        return new Date().toLocaleTimeString('vi-VN', { hour12: false });
    }
});

// ── Copy snippet (expose global) ─────────────────────────────
function copySnippet() {
    const text = document.getElementById('codeSnippet')?.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.pg-copy-btn');
        if (!btn) return;
        const old       = btn.textContent;
        btn.textContent = 'Đã sao chép!';
        setTimeout(() => (btn.textContent = old), 2000);
    });
}


