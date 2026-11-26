/*
 * Bansify Shell for the Accounts dashboard (/me) — 1:1 with MailShell.tsx.
 */
(function () {
  'use strict';

  var CONFIG = window.BANSIFY_SHELL || {};
  var BRAND = CONFIG.brand || { name: 'Bansify', product: 'Account', icon: '/icon-192.png' };
  var CONTENT = CONFIG.contentSelector || '#dash-root';

  function lucide(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  var ICONS = {
    home: lucide('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    personal: lucide('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>'),
    contact: lucide('<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
    security: lucide('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
    devices: lucide('<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>'),
    activity: lucide('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
    storage: lucide('<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>'),
    data: lucide('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
    search: lucide('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    chevronLeft: lucide('<path d="m15 18-6-6 6-6"/>'),
    chevronRight: lucide('<path d="m9 18 6-6-6-6"/>'),
    sun: lucide('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: lucide('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
    close: lucide('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    mail: lucide('<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
    drive: lucide('<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>'),
    meet: lucide('<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
    pay: lucide('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
    ai: lucide('<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>'),
    gitplus: lucide('<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>'),
  };

  /* 8 granular navigation tabs mapped onto the 4 underlying dashboard sections */
  var SECTIONS = [
    { id: 'home', base: 'home', label: 'Home', svg: ICONS.home, title: 'Home', subtitle: 'Overview of your Bansify Account' },
    { id: 'personal', base: 'personal', label: 'Profile & photo', svg: ICONS.personal, title: 'Profile & photo', subtitle: 'Basic info and profile photo across Bansify services' },
    { id: 'contact', base: 'personal', label: 'Contact info', svg: ICONS.contact, title: 'Contact info', subtitle: 'Email addresses and phone numbers linked to your account' },
    { id: 'security', base: 'security', label: 'Password & 2FA', svg: ICONS.security, title: 'Password & 2FA', subtitle: 'Sign-in methods, passkeys, and two-step verification' },
    { id: 'devices', base: 'security', label: 'Devices & sessions', svg: ICONS.devices, title: 'Devices & sessions', subtitle: 'Browsers and devices currently signed in to your account' },
    { id: 'activity', base: 'security', label: 'Security activity', svg: ICONS.activity, title: 'Security activity', subtitle: 'Recent sign-ins, password changes, and security events' },
    { id: 'storage', base: 'data', label: 'Storage & quota', svg: ICONS.storage, title: 'Storage & quota', subtitle: 'Your 5 GB free Bansify Account storage across Mail and Drive' },
    { id: 'data', base: 'data', label: 'Data & export', svg: ICONS.data, title: 'Data & export', subtitle: 'Download a copy of your data or permanently delete your account' },
  ];

  /* 6 dock apps matching Bansify Mail (src/data/dock.ts) */
  var APPS = [
    { id: 'mail', label: 'Bansify Mail', svg: ICONS.mail, url: 'https://mail.bansify.com', logo: 'https://mail.bansify.com/icon-192.png' },
    { id: 'drive', label: 'Bansify Drive', svg: ICONS.drive, url: 'https://drive.bansify.com', logo: 'https://drive.bansify.com/icon-192.png' },
    { id: 'meet', label: 'Bansify Meet', svg: ICONS.meet, url: 'https://meet.bansify.com', logo: 'https://meet.bansify.com/icon-192.png' },
    { id: 'pay', label: 'Bansify Pay', svg: ICONS.pay, url: 'https://pay.bansify.com', logo: 'https://pay.bansify.com/icon-192.png' },
    { id: 'ai', label: 'Bansify AI', svg: ICONS.ai, url: 'https://ai.bansify.com', logo: 'https://ai.bansify.com/icon-192.png' },
    { id: 'gitplus', label: 'GitPlus', svg: ICONS.gitplus, url: 'https://gitplus.bansify.com', logo: 'https://gitplus.bansify.com/icon-192.png' },
  ];

  /* 7 social links matching Bansify Mail (src/data/social.ts + MailShell.tsx) */
  var SOCIAL = [
    { label: 'Facebook', color: '#1877F2', url: 'https://facebook.com/bansifyofficial', svg: lucide('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>') },
    { label: 'Instagram', color: '#E1306C', url: 'https://instagram.com/bansifyofficial', svg: lucide('<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>') },
    { label: 'YouTube', color: '#FF0000', url: 'https://youtube.com/@bansifyofficial', svg: lucide('<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>') },
    { label: 'X', color: '#0F1419', url: 'https://x.com/bansifyofficial', svg: lucide('<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>') },
    { label: 'LinkedIn', color: '#0A66C2', url: 'https://linkedin.com/company/bansifyofficial', svg: lucide('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>') },
    { label: 'Telegram', color: '#229ED9', url: 'https://t.me/bansifyofficial', svg: lucide('<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>') },
    { label: 'GitHub', color: '#181717', url: 'https://github.com/Bansify', svg: lucide('<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>') },
  ];

  var SEARCH_ITEMS = [
    { title: 'Change your photo', sub: 'Profile & photo', icon: 'photo_camera', tab: 'personal' },
    { title: 'Edit your name', sub: 'Profile & photo', icon: 'badge', tab: 'personal' },
    { title: 'Birthday & gender', sub: 'Profile & photo', icon: 'cake', tab: 'personal' },
    { title: 'Recovery email & phone', sub: 'Contact info', icon: 'contact_mail', tab: 'contact' },
    { title: 'Change password', sub: 'Password & 2FA', icon: 'password', tab: 'security' },
    { title: 'Two-step verification (2FA)', sub: 'Password & 2FA', icon: 'phonelink_lock', tab: 'security' },
    { title: 'Passkeys & security keys', sub: 'Password & 2FA', icon: 'passkey', tab: 'security' },
    { title: 'Signed-in devices & sessions', sub: 'Devices & sessions', icon: 'devices', tab: 'devices' },
    { title: 'Sign out everywhere else', sub: 'Devices & sessions', icon: 'logout', tab: 'devices' },
    { title: 'Recent security activity', sub: 'Security activity', icon: 'history', tab: 'activity' },
    { title: 'Account storage & quota', sub: 'Storage & quota', icon: 'cloud', tab: 'storage' },
    { title: 'Download your data (JSON)', sub: 'Data & export', icon: 'download', tab: 'data' },
    { title: 'Delete your Bansify Account', sub: 'Data & export', icon: 'delete_forever', tab: 'data' },
  ];

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function sym(name) {
    return '<span class="msym">' + name + '</span>';
  }

  function findSectionMeta(tabId) {
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id === tabId) return SECTIONS[i];
    }
    return SECTIONS[0];
  }

  function selectTab(tabId) {
    var meta = findSectionMeta(tabId);
    document.body.dataset.bsTab = meta.id;

    var navSelector = (window.BANSIFY_SHELL && window.BANSIFY_SHELL.navSelector) || '.me-nav-item[data-section]';
    var target = document.querySelector(navSelector.replace('[data-section]', '[data-section="' + meta.base + '"]'));
    if (target) target.click();

    var secEl = document.getElementById('section-' + meta.base);
    if (secEl && meta.base !== 'home') {
      var h1 = secEl.querySelector('.section-header h1');
      var p = secEl.querySelector('.section-header p');
      if (h1 && meta.title) h1.textContent = meta.title;
      if (p && meta.subtitle) p.textContent = meta.subtitle;
    }

    var content = document.querySelector(CONTENT);
    if (content) content.scrollTop = 0;

    syncActive(meta.id);
  }

  function syncActive(tabId) {
    document.querySelectorAll('.bs-nav-item').forEach(function (btn) {
      var active = btn.dataset.tab === tabId;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function toggleTheme() {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) toggle.click();
    setTimeout(paintThemeIcon, 60);
  }

  function paintThemeIcon() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark');
    document.querySelectorAll('.bs-theme-inline').forEach(function (btn) {
      btn.innerHTML = dark ? ICONS.sun : ICONS.moon;
    });
  }

  function openAccountSheet(anchorEl) {
    if (typeof window.__BANSIFY_OPEN_ACCOUNT_SHEET === 'function') {
      window.__BANSIFY_OPEN_ACCOUNT_SHEET(anchorEl);
      return;
    }
    var menu = document.getElementById('acct-switch-btn');
    if (menu) menu.click();
  }

  function createLogoImg(src, alt, onFallback) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.onerror = function () {
      if (typeof onFallback === 'function') onFallback();
    };
    return img;
  }

  function openPane(app, triggerBtn) {
    var existing = document.querySelector('.bs-pane');
    if (existing) existing.remove();
    document.querySelectorAll('.bs-dock-app').forEach(function (b) {
      b.classList.remove('is-active');
    });
    if (triggerBtn) triggerBtn.classList.add('is-active');

    var pane = el('section', 'bs-pane');
    pane.setAttribute('aria-label', app.label);

    var head = el('div', 'bs-pane-head');
    var mark = el('span', 'bs-dock-app');
    if (app.logo) {
      mark.appendChild(createLogoImg(app.logo, '', function () { mark.innerHTML = app.svg; }));
    } else {
      mark.innerHTML = app.svg;
    }
    head.appendChild(mark);
    head.appendChild(el('span', 'bs-pane-title', app.label));

    var open = el('a', 'bs-pane-link', 'Open in tab');
    open.href = app.url;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    head.appendChild(open);

    var close = el('button', 'bs-pane-btn', ICONS.close);
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      pane.remove();
      document.body.classList.remove('bs-has-pane');
      document.querySelectorAll('.bs-dock-app').forEach(function (b) { b.classList.remove('is-active'); });
    });
    head.appendChild(close);

    var frame = document.createElement('iframe');
    frame.src = app.url;
    frame.title = app.label;
    frame.loading = 'lazy';

    pane.appendChild(head);
    pane.appendChild(frame);
    document.body.appendChild(pane);
    document.body.classList.add('bs-has-pane');
  }

  function buildPanel() {
    var panel = el('aside', 'bs-panel');
    panel.setAttribute('aria-label', 'Account navigation');

    var brand = el('div', 'bs-brand');
    var mark = el('button', 'bs-brand-mark');
    mark.type = 'button';
    mark.title = 'Toggle panel';
    mark.setAttribute('aria-label', 'Toggle panel');
    mark.appendChild(createLogoImg(BRAND.icon || '/icon-192.png', 'Bansify Accounts', function () { mark.textContent = 'B'; }));
    mark.addEventListener('click', function () {
      document.body.classList.toggle('bs-collapsed');
      try { localStorage.setItem('bs-shell-collapsed', document.body.classList.contains('bs-collapsed') ? '1' : '0'); } catch (e) {}
    });
    brand.appendChild(mark);
    brand.appendChild(el('span', 'bs-brand-name', '<b>' + BRAND.name + '</b> ' + BRAND.product));

    var collapse = el('button', 'bs-collapse', ICONS.chevronLeft);
    collapse.type = 'button';
    collapse.title = 'Collapse';
    collapse.setAttribute('aria-label', 'Collapse panel');
    collapse.addEventListener('click', function () {
      document.body.classList.add('bs-collapsed');
      try { localStorage.setItem('bs-shell-collapsed', '1'); } catch (e) {}
    });
    brand.appendChild(collapse);
    panel.appendChild(brand);

    var nav = el('nav', 'bs-nav');
    SECTIONS.forEach(function (section) {
      var btn = el('button', 'bs-nav-item', '<span class="bs-nav-icon">' + section.svg + '</span><span class="bs-nav-label">' + section.label + '</span>');
      btn.type = 'button';
      btn.dataset.tab = section.id;
      btn.dataset.section = section.base;
      btn.title = section.label;
      btn.setAttribute('aria-label', section.label);
      btn.addEventListener('click', function () { selectTab(section.id); });
      nav.appendChild(btn);
    });
    panel.appendChild(nav);

    var footer = el('div', 'bs-footer');
    footer.appendChild(el('div', 'bs-divider'));

    var expandWrap = el('div', 'bs-expand-wrap');
    var expandBtn = el('button', 'bs-expand-btn', ICONS.chevronRight);
    expandBtn.type = 'button';
    expandBtn.title = 'Expand panel';
    expandBtn.setAttribute('aria-label', 'Expand panel');
    expandBtn.addEventListener('click', function () {
      document.body.classList.remove('bs-collapsed');
      try { localStorage.setItem('bs-shell-collapsed', '0'); } catch (e) {}
    });
    expandWrap.appendChild(expandBtn);
    footer.appendChild(expandWrap);

    var profile = el('button', 'bs-profile');
    profile.type = 'button';
    profile.title = 'Switch or manage accounts';
    var avatar = el('span', 'bs-avatar', 'B');
    var text = el('span', 'bs-profile-text');
    var name = el('span', 'bs-profile-name', 'Account');
    var email = el('span', 'bs-profile-email', '');
    text.appendChild(name);
    text.appendChild(email);
    var theme = el('span', 'bs-theme-inline', ICONS.moon);
    theme.setAttribute('role', 'button');
    theme.setAttribute('tabindex', '0');
    theme.setAttribute('aria-label', 'Toggle theme');
    theme.title = 'Toggle theme';
    theme.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleTheme();
    });
    profile.appendChild(avatar);
    profile.appendChild(text);
    profile.appendChild(theme);
    profile.addEventListener('click', function () { openAccountSheet(profile); });
    footer.appendChild(profile);
    panel.appendChild(footer);

    function syncAvatarNode(target, imgSrc, fallbackLetter) {
      if (!target) return;
      if (imgSrc) {
        var existingImg = target.querySelector('img');
        if (existingImg && existingImg.getAttribute('src') === imgSrc) return;
        target.textContent = '';
        target.appendChild(createLogoImg(imgSrc, '', function () { target.textContent = fallbackLetter; }));
      } else if (target.querySelector('img') || target.textContent !== fallbackLetter) {
        target.textContent = fallbackLetter;
      }
    }

    function refreshProfile() {
      var srcAvatar = document.getElementById('appbar-avatar') || document.getElementById('home-avatar');
      var srcName = document.getElementById('menu-name');
      var srcEmail = document.getElementById('menu-email');
      var nameText = ((srcName && srcName.textContent) || 'Account').trim() || 'Account';
      var emailText = ((srcEmail && srcEmail.textContent) || '').trim();
      var srcImg = srcAvatar ? srcAvatar.querySelector('img') : null;
      var imgUrl = srcImg ? srcImg.getAttribute('src') : '';
      var avatarText = ((srcAvatar && srcAvatar.textContent) || nameText || emailText || 'B').trim().slice(0, 1).toUpperCase() || 'B';

      name.textContent = nameText === '…' ? 'Account' : nameText;
      email.textContent = emailText === '…' ? '' : emailText;
      syncAvatarNode(avatar, imgUrl, avatarText);
      syncAvatarNode(document.querySelector('.bs-dock-avatar'), imgUrl, avatarText);
    }
    refreshProfile();
    setInterval(refreshProfile, 1000);

    return panel;
  }

  function buildTop() {
    var top = el('div', 'bs-top');

    var search = el('div', 'bs-search', '<span class="bs-search-icon">' + ICONS.search + '</span>');
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search account settings';
    input.setAttribute('aria-label', 'Search account settings');

    var menu = el('div', 'bs-search-menu');
    menu.hidden = true;

    function renderMenu(q) {
      var query = (q || '').trim().toLowerCase();
      if (!query) { menu.hidden = true; menu.innerHTML = ''; return; }
      var matches = SEARCH_ITEMS.filter(function (it) {
        return it.title.toLowerCase().indexOf(query) !== -1 || it.sub.toLowerCase().indexOf(query) !== -1;
      });
      if (!matches.length) { menu.hidden = true; menu.innerHTML = ''; return; }
      menu.innerHTML = '';
      matches.slice(0, 6).forEach(function (it) {
        var row = el('button', 'bs-search-item', sym(it.icon) + '<span><span class="bs-search-item-title">' + it.title + '</span><span class="bs-search-item-sub">' + it.sub + '</span></span>');
        row.type = 'button';
        row.addEventListener('click', function () {
          selectTab(it.tab);
          input.value = '';
          menu.hidden = true;
        });
        menu.appendChild(row);
      });
      menu.hidden = false;
    }

    input.addEventListener('input', function () { renderMenu(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; menu.hidden = true; }
    });
    document.addEventListener('click', function (e) {
      if (!search.contains(e.target)) menu.hidden = true;
    });

    search.appendChild(input);
    search.appendChild(menu);
    top.appendChild(search);

    var social = el('div', 'bs-social');
    SOCIAL.forEach(function (item) {
      var link = el('a', null, item.svg);
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = item.label + ' · @bansifyofficial';
      link.setAttribute('aria-label', item.label + ' @bansifyofficial');
      link.style.backgroundColor = item.color;
      social.appendChild(link);
    });
    top.appendChild(social);

    return top;
  }

  function buildDock() {
    var dock = el('aside', 'bs-dock');
    dock.setAttribute('aria-label', 'Bansify apps');

    var avatar = el('button', 'bs-dock-avatar', 'B');
    avatar.type = 'button';
    avatar.title = 'Account';
    avatar.setAttribute('aria-label', 'Account');
    avatar.addEventListener('click', function () { openAccountSheet(avatar); });
    dock.appendChild(avatar);
    dock.appendChild(el('div', 'bs-dock-divider-top'));

    APPS.forEach(function (app) {
      var button = el('button', 'bs-dock-app');
      button.type = 'button';
      button.title = app.label;
      button.setAttribute('aria-label', 'Open ' + app.label);
      button.appendChild(createLogoImg(app.logo, '', function () { button.innerHTML = app.svg; }));
      button.addEventListener('click', function () { openPane(app, button); });
      dock.appendChild(button);
      dock.appendChild(el('div', 'bs-dock-divider'));
    });

    return dock;
  }

  function init() {
    var root = document.querySelector(CONTENT);
    if (!root) return;

    document.body.classList.add('bs-shell-on');
    document.body.dataset.bsTab = 'home';
    root.classList.add('bs-content');
    document.body.appendChild(buildPanel());
    document.body.appendChild(buildTop());
    document.body.appendChild(buildDock());

    try {
      if (localStorage.getItem('bs-shell-collapsed') === '1') {
        document.body.classList.add('bs-collapsed');
      }
    } catch (e) {}

    document.querySelectorAll('[data-jump]').forEach(function (card) {
      card.addEventListener('click', function () {
        var target = card.getAttribute('data-jump');
        if (target) {
          document.body.dataset.bsTab = target;
          syncActive(target);
        }
      });
    });

    syncActive('home');
    paintThemeIcon();
    setInterval(paintThemeIcon, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
