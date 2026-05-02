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

document.addEventListener('DOMContentLoaded', () => {
    // ── HIỆU ỨNG HIỂN THỊ SECTION ───────────────────────
    const revealElements = document.querySelectorAll('.main-doc > section, .endpoint-card, .source-card, .page-hero');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
        el.classList.add('reveal-init');
        revealObserver.observe(el);
    });

    // ── NÚT QUAY LÊN ĐẦU ─────────────────────────────────
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ── THANH TẢI TRANG PHÍA TRÊN ───────────────────────
    const progress = document.createElement('div');
    progress.className = 'top-progress-bar';
    document.body.appendChild(progress);

    window.addEventListener('load', () => {
        progress.style.width = '100%';
        setTimeout(() => {
            progress.style.opacity = '0';
        }, 300);
    });

    // ── TRẠNG THÁI ACTIVE CHO TOC ───────────────────────
    const tocLinks = document.querySelectorAll('.toc-link');
    const sections = document.querySelectorAll('section[id]');
    
    if (tocLinks.length > 0 && sections.length > 0) {
        // Tinh chỉnh observer để nhạy hơn khi cuộn
        const tocObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Chỉ xử lý khi bắt đầu đi vào nửa trên màn hình
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    tocLinks.forEach(link => {
                        link.classList.remove('toc-active');
                        if (link.getAttribute('getAttribute') === `#${id}` || link.hash === `#${id}`) {
                            link.classList.add('toc-active');
                        }
                    });
                }
            });
        }, { 
            threshold: 0, 
            rootMargin: '-80px 0px -70% 0px' // Tập trung vào phần đầu trang (header cao ~80px)
        });

        sections.forEach(section => tocObserver.observe(section));

        // [FALLBACK] Khi ở gần đầu trang, kích hoạt mục TOC đầu tiên.
        window.addEventListener('scroll', () => {
            if (window.scrollY < 100) {
                tocLinks.forEach(l => l.classList.remove('toc-active'));
                if (tocLinks[0]) tocLinks[0].classList.add('toc-active');
            }
        });
    }

    // ── BẬT/TẮT MENU MOBILE ─────────────────────────────
    const navToggle = document.getElementById('mobileNavToggle');
    const siteHeader = document.querySelector('.site-header');
    
    if (navToggle && siteHeader) {
        navToggle.addEventListener('click', () => {
            siteHeader.classList.toggle('nav-active');
            document.body.style.overflow = siteHeader.classList.contains('nav-active') ? 'hidden' : '';
        });

        // [MOBILE] Đóng menu khi người dùng bấm vào liên kết.
        const navLinks = document.querySelectorAll('.nav-link, .lang-toggle');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                siteHeader.classList.remove('nav-active');
                document.body.style.overflow = '';
            });
        });
    }

    // ── THU GỌN/MỞ RỘNG CÁC ENDPOINT CARD ───────────────
    const endpointHeaders = document.querySelectorAll('.endpoint-card .endpoint-header');
    endpointHeaders.forEach(header => {
        const card = header.closest('.endpoint-card');
        if (!card) return;

        // Tránh thêm icon trùng khi script được nạp lại
        if (!header.querySelector('.toggle-icon')) {
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'toggle-icon';
            toggleIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
            header.appendChild(toggleIcon);
        }

        header.addEventListener('click', () => {
            card.classList.toggle('collapsed');
        });

        // Trên trang endpoints: chỉ mở mặc định 2 card chính, các card khác collapse sẵn
        if (window.location.pathname.includes('/endpoints')) {
            if (card.id !== 'ep-default-feature' && card.id !== 'ep-default') {
                card.classList.add('collapsed');
            }
        }
    });

    // ── ANIMATION BEAM CHO SƠ ĐỒ LUỒNG API ──────────────
    const beamContainer = document.getElementById('beam-container');
    const beamsOverlay = document.getElementById('beams-overlay');
    
    if (beamContainer && beamsOverlay) {
        const connections = [
            { from: 'node-src-1', to: 'node-hub' },
            { from: 'node-src-2', to: 'node-hub' },
            { from: 'node-src-3', to: 'node-hub' },
            { from: 'node-src-4', to: 'node-hub' },
            { from: 'node-src-5', to: 'node-hub' },
            { from: 'node-hub', to: 'node-client' }
        ];

        function drawBeams() {
            const containerRect = beamContainer.getBoundingClientRect();
            let svgContent = '';

            connections.forEach((conn, index) => {
                const elFrom = document.getElementById(conn.from);
                const elTo = document.getElementById(conn.to);

                if (!elFrom || !elTo) return;

                const rectFrom = elFrom.getBoundingClientRect();
                const rectTo = elTo.getBoundingClientRect();

                const startX = rectFrom.left - containerRect.left + rectFrom.width / 2;
                const startY = rectFrom.top - containerRect.top + rectFrom.height / 2;
                const endX = rectTo.left - containerRect.left + rectTo.width / 2;
                const endY = rectTo.top - containerRect.top + rectTo.height / 2;

                // [SVG] Đường cong Bezier nối hai nút.
                const controlPointX = startX + (endX - startX) / 2;
                const pathD = `M ${startX} ${startY} C ${controlPointX} ${startY}, ${controlPointX} ${endY}, ${endX} ${endY}`;

                // [SVG] Dùng màu accent tuyệt đối cho gradient trong SVG.
                const curAccent = '#ff6300';
                const gradId = `beam-grad-${index}`;
                // [SVG] So le thời lượng để chuyển động tự nhiên hơn.
                const duration = Math.random() * 1.5 + 2.5;

                svgContent += `
        <defs>
          <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}">
            <stop offset="0%" stop-color="${curAccent}" stop-opacity="0"></stop>
            <stop offset="50%" stop-color="${curAccent}" stop-opacity="0.8"></stop>
            <stop offset="100%" stop-color="${curAccent}" stop-opacity="0"></stop>
            <animate attributeName="x1" values="${startX - 200};${endX}" dur="${duration}s" repeatCount="indefinite" />
            <animate attributeName="x2" values="${startX};${endX + 200}" dur="${duration}s" repeatCount="indefinite" />
            <animate attributeName="y1" values="${startY - 200};${endY}" dur="${duration}s" repeatCount="indefinite" />
            <animate attributeName="y2" values="${startY};${endY + 200}" dur="${duration}s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
        
        <path d="${pathD}" stroke="rgba(255,255,255,0.05)" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="${pathD}" stroke="url(#${gradId})" stroke-width="3" fill="none" stroke-linecap="round" style="filter: drop-shadow(0 0 5px rgba(255, 99, 0, 0.5));" />
      `;
            });

            beamsOverlay.innerHTML = svgContent;
        }

        // Draw initial & on resize
        setTimeout(drawBeams, 100);
        window.addEventListener('resize', drawBeams);
        
        // Also recalculate when fonts/images load fully
        window.addEventListener('load', drawBeams);
    }
});

