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
// copy.js — Copy to clipboard for code blocks

document.querySelectorAll('.copy-btn').forEach((btn) => {
  if (!btn.dataset.defaultLabel) {
    btn.dataset.defaultLabel = btn.textContent.trim() || 'Copy';
  }
  btn.addEventListener('click', async () => {
    const targetId = btn.getAttribute('data-target');
    const target = document.getElementById(targetId);
    if (!target) return;
    const text = target.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    const copiedLabel = btn.getAttribute('data-copied') || 'Copied';
    btn.textContent = copiedLabel;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = btn.dataset.defaultLabel || 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
});

