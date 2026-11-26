/*
 * Bansify five-card shell for /me — pixel-aligned with Bansify Mail (mail.bansify.com).
 * Provides 8 focused navigation sections, a 48px Mail-style content toolbar,
 * live search dropdown, and Universal Account Switcher integration.
 */
(function () {
  'use strict';

  var NAV = [
    { id: 'home', baseTab: 'home', icon: 'home', label: 'Home', sub: 'Overview & quick access' },
    { id: 'personal', baseTab: 'personal', icon: 'badge', label: 'Profile & photo', sub: 'Name, birthday & avatar' },
    { id: 'contact', baseTab: 'personal', icon: 'contact_mail', label: 'Contact info', sub: 'Email, username & phone' },
    { id: 'security', baseTab: 'security', icon: 'shield_lock', label: 'Sign-in & 2FA', sub: 'Password, 2-step & passkeys' },
    { id: 'devices', baseTab: 'security', icon: 'devices', label: 'Your devices', sub: 'Active sessions' },
    { id: 'activity', baseTab: 'security', icon: 'history', label: 'Activity log', sub: 'Recent security events' },
    { id: 'storage', baseTab: 'privacy', icon: 'cloud', label: 'Storage', sub: 'Quota across Bansify' },
    { id: 'privacy', baseTab: 'privacy', icon: 'policy', label: 'Data & privacy', sub: 'Export, preferences & delete' },
  ];

  var SUBTAB_FOR_CARD = {
    'pi-contact-card': 'contact',
    'sec-recommendations-card': 'security',
    'sec-signin-card': 'security',
    'sec-devices-card': 'devices',
    'sec-activity-card': 'activity',
    'dp-storage-card': 'storage',
    'dp-data-card': 'privacy',
    'dp-prefs-card': 'privacy',
    'dp-Legal-card': 'privacy',
    'dp-delete-card': 'privacy',
  };

  var DOCK = [
    { id: 'mail', name: 'Bansify Mail', icon: 'mail', url: 'https://mail.bansify.com' },
    { id: 'drive', name: 'Bansify Drive', icon: 'hard_drive', url: 'https://drive.bansify.com' },
    { id: 'meet', name: 'Bansify Meet', icon: 'videocam', url: 'https://meet.bansify.com' },
    { id: 'pay', name: 'Bansify Pay', icon: 'payments', url: 'https://pay.bansify.com' },
    { id: 'ai', name: 'Bansify AI', icon: 'auto_awesome', url: 'https://ai.bansify.com' },
    { id: 'store', name: 'Bansify Store', icon: 'storefront', url: 'https://store.bansify.com' },
    { id: 'gitplus', name: 'Bansify GitPlus', icon: 'code', url: 'https://gitplus.bansify.com' },
  ];

  var SOCIAL = [
    { name: 'Facebook', bg: 'linear-gradient(180deg,#18ACFE 0%,#0163E0 100%)', href: 'https://facebook.com/bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.7v3h2.6V21h3.3z"/></svg>' },
    { name: 'Instagram', bg: 'radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)', href: 'https://instagram.com/bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M12 4.4c2.5 0 2.8 0 3.7.1.9 0 1.4.2 1.7.3.5.2.8.4 1.1.7.3.3.5.6.7 1.1.1.3.3.8.3 1.7.1.9.1 1.2.1 3.7s0 2.8-.1 3.7c0 .9-.2 1.4-.3 1.7-.2.5-.4.8-.7 1.1-.3.3-.6.5-1.1.7-.3.1-.8.3-1.7.3-.9.1-1.2.1-3.7.1s-2.8 0-3.7-.1c-.9 0-1.4-.2-1.7-.3a3 3 0 0 1-1.8-1.8c-.1-.3-.3-.8-.3-1.7-.1-.9-.1-1.2-.1-3.7s0-2.8.1-3.7c0-.9.2-1.4.3-1.7.2-.5.4-.8.7-1.1.3-.3.6-.5 1.1-.7.3-.1.8-.3 1.7-.3.9-.1 1.2-.1 3.7-.1zm0-1.7c-2.5 0-2.9 0-3.8.1-1 0-1.7.2-2.3.4a4.6 4.6 0 0 0-2.7 2.7c-.2.6-.4 1.3-.4 2.3-.1.9-.1 1.3-.1 3.8s0 2.9.1 3.8c0 1 .2 1.7.4 2.3a4.6 4.6 0 0 0 2.7 2.7c.6.2 1.3.4 2.3.4.9.1 1.3.1 3.8.1s2.9 0 3.8-.1c1 0 1.7-.2 2.3-.4a4.6 4.6 0 0 0 2.7-2.7c.2-.6.4-1.3.4-2.3.1-.9.1-1.3.1-3.8s0-2.9-.1-3.8c0-1-.2-1.7-.4-2.3a4.6 4.6 0 0 0-2.7-2.7c-.6-.2-1.3-.4-2.3-.4-.9-.1-1.3-.1-3.8-.1zm0 4.6a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.9-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"/></svg>' },
    { name: 'YouTube', bg: 'linear-gradient(180deg,#FF2626 0%,#D90000 100%)', href: 'https://youtube.com/@bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M21.8 7.3a2.6 2.6 0 0 0-1.8-1.8C18.4 5 12 5 12 5s-6.4 0-8 .5a2.6 2.6 0 0 0-1.8 1.8C1.7 8.9 1.7 12 1.7 12s0 3.1.5 4.7a2.6 2.6 0 0 0 1.8 1.8c1.6.5 8 .5 8 .5s6.4 0 8-.5a2.6 2.6 0 0 0 1.8-1.8c.5-1.6.5-4.7.5-4.7s0-3.1-.5-4.7z"/><path fill="#E60000" d="M10 15.2V8.8l5.5 3.2-5.5 3.2z"/></svg>' },
    { name: 'X', bg: 'linear-gradient(180deg,#24292E 0%,#000000 100%)', href: 'https://x.com/bansifyofficial', svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { name: 'LinkedIn', bg: 'linear-gradient(180deg,#0E76A8 0%,#0A66C2 100%)', href: 'https://linkedin.com/company/bansifyofficial', svg: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M6.9 8.6H3.8V20h3.1V8.6zM5.3 3.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM20.2 13.4c0-3.3-1.8-4.8-4.1-4.8-1.9 0-2.8 1-3.2 1.8V8.6H9.9V20H13v-6c0-1.6.3-3.1 2.2-3.1 1.9 0 1.9 1.8 1.9 3.2V20h3.1v-6.6z"/></svg>' },
    { name: 'Telegram', bg: 'linear-gradient(180deg,#37BBFE 0%,#007DBB 100%)', href: 'https://t.me/bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#C8DAEA" d="M9.8 17.6l-.3 4.2c.5 0 .7-.2 1-.5l2.4-2.3-3.1-1.4z"/><path fill="#A9C9DD" d="M9.8 17.6l7.3-6.7c.3-.3-.1-.4-.5-.2l-9 5.7 2.2 1.2z"/><path fill="#fff" d="M19.8 4.8L3.7 11c-1.1.4-1.1 1.1-.2 1.3l4.1 1.3 9.5-6c.5-.3.9-.1.5.2l-7.7 7-.3 4.2c.4 0 .6-.2.9-.4l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8L21.5 6c.3-1.1-.4-1.6-1.7-1.2z"/></svg>' },
    { name: 'GitHub', bg: 'linear-gradient(180deg,#2F363D 0%,#161B22 100%)', href: 'https://github.com/Bansify', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M12 2.2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2.2z"/></svg>' },
  ];

  var SEARCH_ITEMS = [
    { label: 'Profile & photo', sub: 'Name, birthday, gender & avatar', subtab: 'personal', icon: 'badge' },
    { label: 'Contact info', sub: 'Bansify email, username & phone number', subtab: 'contact', icon: 'contact_mail' },
    { label: 'Change password', sub: 'Update your account password', subtab: 'security', icon: 'password' },
    { label: '2-Step Verification', sub: 'Authenticator app & backup codes', subtab: 'security', icon: 'verified_user' },
    { label: 'Passkeys', sub: 'Passwordless biometric sign-in', subtab: 'security', icon: 'fingerprint' },
    { label: 'Recovery email & phone', sub: 'Account recovery options', subtab: 'security', icon: 'Lock_reset' },
    { label: 'Your devices', sub: 'Manage signed-in browsers & phones', subtab: 'devices', icon: 'devices' },
    { label: 'Security activity log', sub: 'Recent sign-ins & security events', subtab: 'activity', icon: 'history' },
    { label: 'Account storage', sub: '15 GB quota across Bansify', subtab: 'storage', icon: 'cloud' },
    { label: 'Download your data', sub: 'Export profile & activity as JSON', subtab: 'privacy', icon: 'download' },
    { label: 'Delete your account', sub: 'Permanently delete your Bansify Account', subtab: 'privacy', icon: 'delete_forever' },
  ];

  var activeSubtab = 'home';

  function findNav(id) {
    for (var i = 0; i < NAV.length; i++) {
      if (NAV[i].id === id) return NAV[i];
    }
    return NAV[0];
  }

  function updateCardHeader(navItem) {
    var iconEl = document.getElementById('bs-card-head-icon-sym');
    var titleEl = document.getElementById('bs-card-head-title');
    var subEl = document.getElementById('bs-card-head-sub');
    if (iconEl) iconEl.textContent = navItem.icon;
    if (titleEl) titleEl.textContent = navItem.label;
    if (subEl) subEl.textContent = '(' + navItem.sub + ')';
  }

  function selectSubtab(subtabId, triggerUnderlying) {
    var navItem = findNav(subtabId);
    activeSubtab = navItem.id;
    document.body.setAttribute('data-bs-subtab', navItem.id);
    updateCardHeader(navItem);

    var buttons = document.querySelectorAll('.bs-nav-item');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('is-active', buttons[i].getAttribute('data-subtab') === navItem.id);
    }

    if (triggerUnderlying !== false) {
      var orig = document.querySelector('.me-sidebar [data-tab="' + navItem.baseTab + '"]');
      if (orig && !orig.classList.contains('active')) {
        orig.click();
      }
      var body = document.querySelector('.me-body');
      if (body) body.scrollTop = 0;
    }
    document.body.classList.remove('bs-mobile-open');
  }

  function triggerAccountPicker(anchorEl) {
    var menu = window.BansifyAccountMenu || window.GothwadAccountMenu;
    if (menu && typeof menu.toggle === 'function') {
      menu.toggle(anchorEl);
      return;
    }
    var orig = document.getElementById('avatar-btn');
    if (orig) orig.click();
  }

  function ensureCardHeader(dashRoot) {
    if (document.getElementById('bs-card-head')) return;
    var head = document.createElement('header');
    head.id = 'bs-card-head';
    head.className = 'bs-card-head';
    head.innerHTML =
      '<div class="bs-card-head-left">' +
        '<span class="bs-card-head-icon"><span class="msym" id="bs-card-head-icon-sym">home</span></span>' +
        '<span class="bs-card-head-dot">&middot;</span>' +
        '<span class="bs-card-head-title" id="bs-card-head-title">Home</span>' +
        '<span class="bs-card-head-sub" id="bs-card-head-sub">(Overview &amp; quick access)</span>' +
        '<button type="button" class="bs-card-refresh" id="bs-card-refresh" title="Refresh" aria-label="Refresh">' +
          '<span class="msym">refresh</span>' +
        '</button>' +
      '</div>' +
      '<button type="button" class="bs-card-acct" id="bs-card-acct" title="Switch account">' +
        '<span class="msym">manage_accounts</span>' +
        '<span id="bs-card-acct-email">Account</span>' +
      '</button>';
    dashRoot.insertBefore(head, dashRoot.firstChild);
    var refreshBtn = head.querySelector('#bs-card-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        window.location.reload();
      });
    }
    var acctBtn = head.querySelector('#bs-card-acct');
    if (acctBtn) {
      acctBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        triggerAccountPicker(acctBtn);
      });
    }
  }

  function build() {
    if (document.getElementById('bs-panel')) return;
    var dash = document.getElementById('dash-root');
    if (!dash) return;
    document.body.classList.add('bs-shell-on');
    ensureCardHeader(dash);

    if (localStorage.getItem('bs_shell_collapsed') === '1') {
      document.body.classList.add('bs-collapsed');
    }

    var panel = document.createElement('aside');
    panel.id = 'bs-panel';
    panel.className = 'bs-panel';
    panel.innerHTML =
      '<div class="bs-brand">' +
        '<button type="button" class="bs-brand-mark" id="bs-logo" title="Toggle sidebar">' +
          '<img src="/icon-192.png" alt="Bansify" onerror="this.remove()" />' +
        '</button>' +
        '<span class="bs-brand-name"><b>Bansify</b> Account</span>' +
        '<button type="button" class="bs-collapse" id="bs-collapse" title="Collapse sidebar">' +
          '<span class="msym">chevron_left</span>' +
        '</button>' +
      '</div>' +
      '<nav class="bs-nav" id="bs-nav" aria-label="Account sections">' +
        NAV.map(function (n, idx) {
          return (
            '<button type="button" class="bs-nav-item' + (idx === 0 ? ' is-active' : '') + '" data-subtab="' + n.id + '" title="' + n.label + '">' +
              '<span class="msym">' + n.icon + '</span>' +
              '<span>' + n.label + '</span>' +
            '</button>'
          );
        }).join('') +
      '</nav>' +
      '<div class="bs-panel-divider"></div>' +
      '<div class="bs-profile">' +
        '<button type="button" class="bs-profile-btn" id="bs-profile-btn" title="Switch account">' +
          '<span class="bs-avatar" id="bs-avatar">U</span>' +
          '<span class="bs-profile-meta">' +
            '<div class="bs-profile-name" id="bs-name">Account</div>' +
            '<div class="bs-profile-email" id="bs-email">&nbsp;</div>' +
          '</span>' +
          '<span class="msym bs-theme-icon" id="bs-theme-icon" title="Toggle theme">dark_mode</span>' +
        '</button>' +
      '</div>';

    var top = document.createElement('div');
    top.className = 'bs-top';
    top.innerHTML =
      '<div class="bs-search" id="bs-search-wrap">' +
        '<button type="button" class="bs-mobile-menu" id="bs-mobile-menu" aria-label="Open navigation">' +
          '<span class="msym">menu</span>' +
        '</button>' +
        '<span class="msym">search</span>' +
        '<input type="search" id="bs-search-input" placeholder="Search account settings" autocomplete="off" />' +
        '<div class="bs-search-results" id="bs-search-results" hidden></div>' +
      '</div>' +
      '<div class="bs-social">' +
        SOCIAL.map(function (s) {
          return '<a href="' + s.href + '" target="_blank" rel="noopener noreferrer" title="' + s.name + '" style="background:' + s.bg + '">' + s.svg + '</a>';
        }).join('') +
      '</div>';

    var dock = document.createElement('aside');
    dock.className = 'bs-dock';
    dock.innerHTML =
      '<button type="button" class="bs-dock-avatar" id="bs-dock-avatar" title="Bansify Account">' +
        '<span class="bs-avatar" id="bs-dock-avatar-inner">U</span>' +
      '</button>' +
      '<div class="bs-dock-line"></div>' +
      DOCK.map(function (app, i) {
        var logo = app.url.replace(/\/+$/, '') + '/icon-192.png';
        return (
          (i > 0 ? '<div class="bs-dock-line sm"></div>' : '') +
          '<button type="button" class="bs-dock-app" data-app="' + app.id + '" title="' + app.name + '">' +
            '<img src="' + logo + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'msym\',textContent:\'' + app.icon + '\'}))" />' +
          '</button>'
        );
      }).join('');

    var pane = document.createElement('aside');
    pane.id = 'bs-pane';
    pane.className = 'bs-pane';
    pane.hidden = true;
    pane.innerHTML =
      '<div class="bs-pane-head">' +
        '<span class="msym" id="bs-pane-icon" style="color:var(--bs-brand);font-size:18px">apps</span>' +
        '<span id="bs-pane-title" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>' +
        '<a id="bs-pane-ext" target="_blank" rel="noopener noreferrer" title="Open in new tab"><span class="msym" style="font-size:16px">open_in_new</span></a>' +
        '<button type="button" id="bs-pane-close" title="Close"><span class="msym" style="font-size:18px">close</span></button>' +
      '</div>';

    document.body.appendChild(panel);
    document.body.appendChild(top);
    document.body.appendChild(dock);
    document.body.appendChild(pane);

    wire(panel, top, dock, pane);
    selectSubtab('home', false);
  }

  function wire(panel, top, dock, pane) {
    function toggleCollapse() {
      var c = document.body.classList.toggle('bs-collapsed');
      try { localStorage.setItem('bs_shell_collapsed', c ? '1' : '0'); } catch (_) {}
    }
    panel.querySelector('#bs-collapse').addEventListener('click', toggleCollapse);
    panel.querySelector('#bs-logo').addEventListener('click', function () {
      if (document.body.classList.contains('bs-collapsed')) toggleCollapse();
    });

    var mobBtn = top.querySelector('#bs-mobile-menu');
    if (mobBtn) {
      mobBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        document.body.classList.toggle('bs-mobile-open');
      });
    }

    panel.querySelector('#bs-nav').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-subtab]');
      if (!btn) return;
      selectSubtab(btn.getAttribute('data-subtab'), true);
    });

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-goto-tab], [data-scroll-to]');
      if (!trigger) return;
      var scrollTarget = trigger.getAttribute('data-scroll-to');
      var gotoTab = trigger.getAttribute('data-goto-tab');
      if (scrollTarget && SUBTAB_FOR_CARD[scrollTarget]) {
        selectSubtab(SUBTAB_FOR_CARD[scrollTarget], false);
      } else if (gotoTab) {
        selectSubtab(gotoTab, false);
      }
    });

    var themeIcon = panel.querySelector('#bs-theme-icon');
    function syncThemeIcon() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark');
      themeIcon.textContent = dark ? 'light_mode' : 'dark_mode';
    }
    syncThemeIcon();
    new MutationObserver(syncThemeIcon).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    panel.querySelector('#bs-profile-btn').addEventListener('click', function (e) {
      if (e.target.closest('#bs-theme-icon')) {
        e.stopPropagation();
        var origTheme = document.getElementById('theme-toggle');
        if (origTheme) origTheme.click();
        return;
      }
      e.stopPropagation();
      triggerAccountPicker(panel.querySelector('#bs-profile-btn'));
    });

    dock.querySelector('#bs-dock-avatar').addEventListener('click', function (e) {
      e.stopPropagation();
      triggerAccountPicker(dock.querySelector('#bs-dock-avatar'));
    });

    var input = top.querySelector('#bs-search-input');
    var results = top.querySelector('#bs-search-results');

    function renderSearch(q) {
      var query = (q || '').trim().toLowerCase();
      var matches = SEARCH_ITEMS.filter(function (item) {
        return !query || item.label.toLowerCase().indexOf(query) !== -1 || item.sub.toLowerCase().indexOf(query) !== -1;
      }).slice(0, 6);
      if (!matches.length) {
        results.hidden = true;
        return;
      }
      results.innerHTML = matches.map(function (m, idx) {
        return (
          '<button type="button" class="bs-search-option" data-idx="' + idx + '">' +
            '<span class="msym">' + m.icon + '</span>' +
            '<span>' +
              '<span class="bs-search-option-title">' + m.label + '</span>' +
              '<span class="bs-search-option-sub">' + m.sub + '</span>' +
            '</span>' +
          '</button>'
        );
      }).join('');
      results.hidden = false;
      var opts = results.querySelectorAll('.bs-search-option');
      for (var i = 0; i < opts.length; i++) {
        (function (item) {
          opts[i].addEventListener('click', function () {
            results.hidden = true;
            input.value = '';
            selectSubtab(item.subtab, true);
          });
        })(matches[i]);
      }
    }

    input.addEventListener('focus', function () { renderSearch(input.value); });
    input.addEventListener('input', function () { renderSearch(input.value); });
    document.addEventListener('click', function (e) {
      if (!top.querySelector('#bs-search-wrap').contains(e.target)) {
        results.hidden = true;
      }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        input.focus();
      } else if (e.key === 'Escape') {
        results.hidden = true;
      }
    });

    var openId = null;
    function closePane() {
      openId = null;
      pane.hidden = true;
      var old = pane.querySelector('iframe');
      if (old) old.remove();
      var apps = dock.querySelectorAll('.bs-dock-app');
      for (var i = 0; i < apps.length; i++) apps[i].classList.remove('is-open');
    }
    function openPane(app) {
      if (openId === app.id) { closePane(); return; }
      closePane();
      openId = app.id;
      pane.querySelector('#bs-pane-icon').textContent = app.icon;
      pane.querySelector('#bs-pane-title').textContent = app.name;
      pane.querySelector('#bs-pane-ext').href = app.url;
      var frame = document.createElement('iframe');
      frame.src = app.url;
      frame.title = app.name;
      pane.appendChild(frame);
      pane.hidden = false;
      var btn = dock.querySelector('[data-app="' + app.id + '"]');
      if (btn) btn.classList.add('is-open');
    }
    pane.querySelector('#bs-pane-close').addEventListener('click', closePane);
    dock.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-app]');
      if (!btn) return;
      var id = btn.getAttribute('data-app');
      for (var i = 0; i < DOCK.length; i++) {
        if (DOCK[i].id === id) { openPane(DOCK[i]); break; }
      }
    });

    function syncUser() {
      var nameEl = document.getElementById('hero-name') || document.getElementById('pi-name');
      var emailEl = document.getElementById('hero-email') || document.getElementById('pi-email');
      var avEl = document.getElementById('avatar-btn');
      var name = nameEl && nameEl.textContent ? nameEl.textContent.replace(/^Welcome,\s*/i, '').trim() : '';
      var email = emailEl && emailEl.textContent ? emailEl.textContent.trim() : '';
      if (name && name !== '—') document.getElementById('bs-name').textContent = name;
      if (email && email !== '—') {
        document.getElementById('bs-email').textContent = email;
        var headEmail = document.getElementById('bs-card-acct-email');
        if (headEmail) headEmail.textContent = email;
      }
      var img = avEl ? avEl.querySelector('img') : null;
      var targets = [document.getElementById('bs-avatar'), document.getElementById('bs-dock-avatar-inner')];
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t) continue;
        if (img && img.src) {
          if (!t.querySelector('img') || t.querySelector('img').src !== img.src) {
            t.innerHTML = '<img src="' + img.src + '" alt="" />';
          }
        } else if (name || email) {
          t.textContent = (name || email).charAt(0).toUpperCase();
        }
      }
    }
    syncUser();
    var root = document.getElementById('dash-root');
    if (root) new MutationObserver(syncUser).observe(root, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
