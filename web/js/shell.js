/*
 * Bansify five-card shell for /me — pixel-aligned with Bansify Mail (mail.bansify.com).
 * Provides 8 focused navigation sections, a 48px Mail-style content toolbar,
 * live search dropdown, and Universal Account Switcher integration.
 */
(function () {
  'use strict';

  var NAV = [
    {
      id: 'home',
      baseTab: 'home',
      icon: 'home',
      label: 'Home',
      sub: 'Overview & quick access',
    },
    {
      id: 'personal',
      baseTab: 'personal',
      icon: 'badge',
      label: 'Profile & photo',
      sub: 'Name, birthday & avatar',
    },
    {
      id: 'contact',
      baseTab: 'personal',
      icon: 'contact_mail',
      label: 'Contact info',
      sub: 'Email, username & phone',
    },
    {
      id: 'security',
      baseTab: 'security',
      icon: 'shield_lock',
      label: 'Sign-in & 2FA',
      sub: 'Password, 2-step & passkeys',
    },
    {
      id: 'devices',
      baseTab: 'security',
      icon: 'devices',
      label: 'Your devices',
      sub: 'Active sessions',
    },
    {
      id: 'activity',
      baseTab: 'security',
      icon: 'history',
      label: 'Activity log',
      sub: 'Recent security events',
    },
    {
      id: 'storage',
      baseTab: 'privacy',
      icon: 'cloud',
      label: 'Storage',
      sub: 'Quota across Bansify',
    },
    {
      id: 'privacy',
      baseTab: 'privacy',
      icon: 'policy',
      label: 'Data & privacy',
      sub: 'Export, preferences & delete',
    },
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
    { id: 'files', name: 'Bansify Files', icon: 'folder', url: 'https://drive.bansify.com' },
    { id: 'notes', name: 'Bansify Notes', icon: 'description', url: 'https://notes.bansify.com' },
    { id: 'cal', name: 'Calendar', icon: 'calendar_month', url: 'https://calendar.bansify.com' },
    { id: 'contacts', name: 'Contacts', icon: 'contacts', url: 'https://contacts.bansify.com' },
    { id: 'keep', name: 'Keep', icon: 'sticky_note_2', url: 'https://keep.bansify.com' },
    { id: 'tasks', name: 'Tasks', icon: 'task_alt', url: 'https://tasks.bansify.com' },
  ];

  var SOCIAL = [
    { name: 'Website', bg: '#0494f4', href: 'https://bansify.com', svg: '<span class="msym" style="font-size:18px;color:#fff">language</span>' },
    { name: 'Instagram', bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', href: 'https://instagram.com/bansify', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
    { name: 'YouTube', bg: '#FF0000', href: 'https://youtube.com/@bansify', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
    { name: 'Facebook', bg: '#1877F2', href: 'https://facebook.com/bansify', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>' },
    { name: 'X', bg: '#000', href: 'https://x.com/bansify', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { name: 'Telegram', bg: '#229ED9', href: 'https://t.me/bansify', svg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' },
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
        return (
          (i > 0 ? '<div class="bs-dock-line sm"></div>' : '') +
          '<button type="button" class="bs-dock-app" data-app="' + app.id + '" title="' + app.name + '">' +
            '<span class="msym">' + app.icon + '</span>' +
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
