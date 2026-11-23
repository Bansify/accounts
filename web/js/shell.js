/*
 * Bansify shell for the Accounts dashboard.
 *
 * Renders the same left panel and right app dock as bansify.com and Mail, then drives
 * the dashboard's existing controls (the original nav buttons, theme toggle and account
 * menu) instead of replacing them, so no behaviour is lost.
 */
(function () {
  'use strict';

  var SECTIONS = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'personal', label: 'Personal info', icon: 'person' },
    { id: 'security', label: 'Security', icon: 'shield_lock' },
    { id: 'data', label: 'Data & privacy', icon: 'database' },
    { id: 'apps', label: 'Connected apps', icon: 'apps' },
    { id: 'people', label: 'People', icon: 'group' },
  ];

  var APPS = [
    { label: 'Mail', icon: 'mail', url: 'https://mail.bansify.com' },
    { label: 'Drive', icon: 'hard_drive', url: 'https://drive.bansify.com' },
    { label: 'Meet', icon: 'videocam', url: 'https://meet.bansify.com' },
    { label: 'Pay', icon: 'payments', url: 'https://pay.bansify.com' },
    { label: 'AI', icon: 'auto_awesome', url: 'https://ai.bansify.com' },
    { label: 'Store', icon: 'storefront', url: 'https://store.bansify.com' },
    { label: 'GitPlus', icon: 'code', url: 'https://gitplus.bansify.com' },
    { label: 'Website', icon: 'public', url: 'https://bansify.com' },
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

  function selectSection(id) {
    var target = document.querySelector('.me-nav-item[data-section="' + id + '"]');
    if (target) target.click();
    syncActive(id);
  }

  function syncActive(id) {
    document.querySelectorAll('.bs-nav-item').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.section === id);
    });
  }

  function buildPanel() {
    var panel = el('aside', 'bs-panel');
    panel.setAttribute('aria-label', 'Account navigation');

    var brand = el('div', 'bs-brand');
    brand.appendChild(el('span', 'bs-brand-mark', 'B'));
    brand.appendChild(el('span', 'bs-brand-name', 'Account'));
    var collapse = el('button', 'bs-collapse', sym('chevron_left'));
    collapse.type = 'button';
    collapse.setAttribute('aria-label', 'Collapse panel');
    collapse.addEventListener('click', function () {
      var next = !document.body.classList.contains('bs-collapsed');
      document.body.classList.toggle('bs-collapsed', next);
      collapse.innerHTML = sym(next ? 'chevron_right' : 'chevron_left');
      try {
        localStorage.setItem('bs-shell-collapsed', next ? '1' : '0');
      } catch (e) {}
    });
    brand.appendChild(collapse);
    panel.appendChild(brand);
    panel.appendChild(el('div', 'bs-divider'));

    var nav = el('nav', 'bs-nav');
    SECTIONS.forEach(function (section) {
      var btn = el('button', 'bs-nav-item', sym(section.icon) + '<span>' + section.label + '</span>');
      btn.type = 'button';
      btn.dataset.section = section.id;
      btn.addEventListener('click', function () {
        selectSection(section.id);
      });
      nav.appendChild(btn);
    });
    panel.appendChild(nav);

    var footer = el('div', 'bs-footer');
    footer.appendChild(el('div', 'bs-divider'));

    var utils = el('div', 'bs-utils');
    var theme = el('button', 'bs-util', sym('dark_mode'));
    theme.type = 'button';
    theme.setAttribute('aria-label', 'Toggle theme');
    theme.addEventListener('click', function () {
      var toggle = document.querySelector('[data-theme-toggle]');
      if (toggle) toggle.click();
    });
    var bell = el('button', 'bs-util', sym('notifications'));
    bell.type = 'button';
    bell.setAttribute('aria-label', 'Notifications');
    var settings = el('button', 'bs-util', sym('settings'));
    settings.type = 'button';
    settings.setAttribute('aria-label', 'Settings');
    settings.addEventListener('click', function () {
      selectSection('security');
    });
    utils.appendChild(bell);
    utils.appendChild(theme);
    utils.appendChild(settings);
    footer.appendChild(utils);
    footer.appendChild(el('div', 'bs-divider'));

    var profile = el('button', 'bs-profile');
    profile.type = 'button';
    var avatar = el('span', 'bs-avatar', 'B');
    var text = el('span', 'bs-profile-text');
    var name = el('span', 'bs-profile-name', 'Account');
    var email = el('span', 'bs-profile-email', '');
    text.appendChild(name);
    text.appendChild(email);
    profile.appendChild(avatar);
    profile.appendChild(text);
    profile.addEventListener('click', function () {
      var menu = document.getElementById('acct-switch-btn');
      if (menu) menu.click();
    });
    footer.appendChild(profile);
    panel.appendChild(footer);

    // keep the block in step with the dashboard's own account data
    function refreshProfile() {
      var srcAvatar = document.getElementById('appbar-avatar');
      var srcName = document.getElementById('menu-name');
      var srcEmail = document.getElementById('menu-email');
      var avatarText = (srcAvatar && srcAvatar.textContent) || 'B';
      var nameText = (srcName && srcName.textContent) || 'Account';
      var emailText = (srcEmail && srcEmail.textContent) || '';
      avatar.textContent = avatarText.trim().slice(0, 1).toUpperCase() || 'B';
      name.textContent = nameText.trim() || 'Account';
      email.textContent = emailText.trim() === '…' ? '' : emailText.trim();
      var dockAvatar = document.querySelector('.bs-dock-avatar');
      if (dockAvatar) dockAvatar.textContent = avatar.textContent;
    }
    refreshProfile();
    setInterval(refreshProfile, 2000);

    return panel;
  }

  function buildDock() {
    var dock = el('aside', 'bs-dock');
    dock.setAttribute('aria-label', 'Bansify apps');

    var avatar = el('a', 'bs-dock-avatar', 'B');
    avatar.href = '/me';
    avatar.setAttribute('aria-label', 'Account');
    dock.appendChild(avatar);
    dock.appendChild(el('div', 'bs-dock-divider'));

    APPS.forEach(function (app, index) {
      if (index === Math.ceil(APPS.length / 2)) dock.appendChild(el('div', 'bs-dock-divider'));
      var link = el('a', 'bs-dock-app', sym(app.icon));
      link.href = app.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = app.label;
      link.setAttribute('aria-label', app.label);
      dock.appendChild(link);
    });

    return dock;
  }

  function init() {
    var root = document.getElementById('dash-root');
    if (!root) return;

    document.body.appendChild(buildPanel());
    document.body.appendChild(buildDock());

    try {
      if (localStorage.getItem('bs-shell-collapsed') === '1') {
        document.body.classList.add('bs-collapsed');
        var collapse = document.querySelector('.bs-collapse');
        if (collapse) collapse.innerHTML = sym('chevron_right');
      }
    } catch (e) {}

    // mirror the dashboard's own active section into the new panel
    document.querySelectorAll('.me-nav-item[data-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncActive(btn.dataset.section);
      });
    });
    syncActive('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
