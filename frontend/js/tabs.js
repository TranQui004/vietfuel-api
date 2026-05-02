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
 * switchTab — Chuyển đổi tab trong mục Bắt đầu nhanh (Homepage)
 * Được định nghĩa toàn cục (window) để hoạt động với onclick trong EJS.
 */
window.switchTab = function(event, tabId) {
    // 1. Lấy tất cả các nút tab và các khung nội dung
    const container = event.currentTarget.closest('.quickstart-section');
    if (!container) return;

    const btns = container.querySelectorAll('.tab-btn');
    const panes = container.querySelectorAll('.tab-pane');

    // 2. Xóa trạng thái active cũ
    btns.forEach(btn => btn.classList.remove('tab-active'));
    panes.forEach(pane => pane.classList.remove('active'));

    // 3. Kích hoạt tab mới
    event.currentTarget.classList.add('tab-active');
    const targetPane = document.getElementById(tabId);
    if (targetPane) {
        targetPane.classList.add('active');
    }
};

// Khởi tạo mặc định khi trang tải (nếu cần)
document.addEventListener('DOMContentLoaded', () => {
    const defaultTab = document.querySelector('.tab-btn.tab-active');
    if (defaultTab) {
        // Đảm bảo pane tương ứng hiển thị
        const tabId = defaultTab.textContent.toLowerCase().includes('curl') ? 'curl' : '';
        if (tabId) {
            const pane = document.getElementById(tabId);
            if (pane) pane.classList.add('active');
        }
    }
});

