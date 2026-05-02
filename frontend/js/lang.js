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
// lang.js — Bilingual toggle, persisted in localStorage

const SUPPORTED_LANGS = ['vi', 'en'];

function applyLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = 'vi';
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem('vietfuel-lang', lang);

  document.querySelectorAll('[data-vi][data-en]').forEach((el) => {
    el.innerHTML = el.getAttribute(`data-${lang}`);
  });

  const label = document.getElementById('langLabel');
  if (label) label.textContent = lang === 'vi' ? 'EN' : 'VI';
}

const toggle = document.getElementById('langToggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-lang') || 'vi';
    applyLanguage(current === 'vi' ? 'en' : 'vi');
  });
}

// Apply on load
applyLanguage(localStorage.getItem('vietfuel-lang') || 'vi');

window.getCurrentLang = () => document.documentElement.getAttribute('data-lang') || 'vi';

