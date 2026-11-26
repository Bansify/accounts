/* Bansify five-card shell for the Accounts dashboard (/me). */
(function () {
  'use strict';
  var SECTIONS = [
    { id: 'home', parent: 'home', label: 'Home', icon: 'home', sub: 'Account overview, security checkup and quick shortcuts' },
    { id: 'personal', parent: 'personal', label: 'Profile & photo', icon: 'person', sub: 'Your profile photo, display name, birthday and gender' },
    { id: 'contact', parent: 'personal', label: 'Contact info', icon: 'alternate_email', sub: 'Account email address, phone number and recovery email' },
    { id: 'security', parent: 'security', label: 'Sign-in & 2FA', icon: 'shield_lock', sub: 'Password, 2-Step Verification, Google accounts and passkeys' },
    { id: 'devices', parent: 'security', label: 'Your devices', icon: 'devices', sub: 'Active browser and device sessions signed in to this account' },
    { id: 'activity', parent: 'data', label: 'Activity log', icon: 'history', sub: 'Recent sign-ins, security updates and account events' },
    { id: 'storage', parent: 'data', label: 'Storage', icon: 'cloud', sub: 'Shared storage usage across Bansify Drive and Mail' },
    { id: 'data', parent: 'data', label: 'Data & privacy', icon: 'database', sub: 'Export your account data or permanently delete your account' },
  ];
  var SEARCH_ITEMS = [
    { title: 'Profile photo', sub: 'Profile & photo · Change avatar', kw: 'photo avatar picture image crop', icon: 'photo_camera', tab: 'personal', clickId: 'pi-photo-edit' },
    { title: 'Display name', sub: 'Profile & photo · Edit name', kw: 'name first last surname', icon: 'person', tab: 'personal', dialog: 'name' },
    { title: 'Date of birth', sub: 'Profile & photo · Optional birthday', kw: 'birthday dob age birth date', icon: 'cake', tab: 'personal', dialog: 'dob' },
    { title: 'Gender', sub: 'Profile & photo · Optional details', kw: 'gender male female optional', icon: 'diversity_3', tab: 'personal', dialog: 'gender' },
    { title: 'Account email address', sub: 'Contact info · Primary Bansify address', kw: 'email username mailbox address', icon: 'alternate_email', tab: 'contact', focusId: 'pi-email' },
    { title: 'Phone number', sub: 'Contact info · Sign-in identifier', kw: 'phone mobile telephone number', icon: 'call', tab: 'contact', dialog: 'phone' },
    { title: 'Recovery email', sub: 'Contact info · Backup recovery address', kw: 'recovery backup email verify', icon: 'mark_email_read', tab: 'contact', dialog: 'recovery' },
    { title: 'Change password', sub: 'Sign-in & 2FA · Password security', kw: 'password change reset login', icon: 'password', tab: 'security', dialog: 'password' },
    { title: '2-Step Verification', sub: 'Sign-in & 2FA · Authenticator app & codes', kw: '2fa mfa two factor totp otp authenticator', icon: 'phonelink_lock', tab: 'security', clickId: 'btn-mfa-settings' },
    { title: 'Google accounts', sub: 'Sign-in & 2FA · Connected Google sign-in', kw: 'google gmail linked connect', icon: 'login', tab: 'security', clickId: 'btn-google-settings' },
    { title: 'Passkeys', sub: 'Sign-in & 2FA · Biometric & security keys', kw: 'passkey fingerprint face biometric webauthn', icon: 'key', tab: 'security', clickId: 'btn-passkey-settings' },
    { title: 'Your devices & sessions', sub: 'Your devices · Active browsers and devices', kw: 'devices sessions browsers phones sign out', icon: 'devices', tab: 'devices', focusId: 'device-list' },
    { title: 'Sign out other sessions', sub: 'Your devices · Revoke other devices', kw: 'revoke sign out other sessions logout', icon: 'logout', tab: 'devices', focusId: 'btn-revoke-others' },
    { title: 'Recent security activity', sub: 'Activity log · Sign-ins and security events', kw: 'activity history events log', icon: 'history', tab: 'activity', focusId: 'dp-activity' },
    { title: 'Storage & quota', sub: 'Storage · Bansify Drive & Mail usage', kw: 'storage quota space drive mail', icon: 'cloud', tab: 'storage', focusId: 'dp-storage-card' },
    { title: 'Export account data', sub: 'Data & privacy · Download JSON archive', kw: 'export download backup data json', icon: 'download', tab: 'data', focusId: 'btn-export' },
    { title: 'Delete your Bansify Account', sub: 'Data & privacy · Permanent account deletion', kw: 'delete close remove erase account', icon: 'warning', tab: 'data', clickId: 'btn-open-delete' },
  ];
  var APPS = [
    { label: 'Mail', icon: 'mail', url: 'https://mail.bansify.com' },
    { label: 'Drive', icon: 'hard_drive', url: 'https://drive.bansify.com' },
    { label: 'Meet', icon: 'videocam', url: 'https://meet.bansify.com' },
    { label: 'Pay', icon: 'payments', url: 'https://pay.bansify.com' },
    { label: 'AI', icon: 'auto_awesome', url: 'https://ai.bansify.com' },
    { label: 'GitPlus', icon: 'code', url: 'https://gitplus.bansify.com', svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>' },
  ];
  var SOCIAL = [
    { label: 'Facebook', bg: 'linear-gradient(180deg,#18ACFE 0%,#0163E0 100%)', url: 'https://facebook.com/bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.7v3h2.6V21h3.3z"/></svg>' },
    { label: 'Instagram', bg: 'radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)', url: 'https://instagram.com/bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M12 4.4c2.5 0 2.8 0 3.7.1.9 0 1.4.2 1.7.3.5.2.8.4 1.1.7.3.3.5.6.7 1.1.1.3.3.8.3 1.7.1.9.1 1.2.1 3.7s0 2.8-.1 3.7c0 .9-.2 1.4-.3 1.7-.2.5-.4.8-.7 1.1-.3.3-.6.5-1.1.7-.3.1-.8.3-1.7.3-.9.1-1.2.1-3.7.1s-2.8 0-3.7-.1c-.9 0-1.4-.2-1.7-.3a3 3 0 0 1-1.8-1.8c-.1-.3-.3-.8-.3-1.7-.1-.9-.1-1.2-.1-3.7s0-2.8.1-3.7c0-.9.2-1.4.3-1.7.2-.5.4-.8.7-1.1.3-.3.6-.5 1.1-.7.3-.1.8-.3 1.7-.3.9-.1 1.2-.1 3.7-.1zm0-1.7c-2.5 0-2.9 0-3.8.1-1 0-1.7.2-2.3.4a4.6 4.6 0 0 0-2.7 2.7c-.2.6-.4 1.3-.4 2.3-.1.9-.1 1.3-.1 3.8s0 2.9.1 3.8c0 1 .2 1.7.4 2.3a4.6 4.6 0 0 0 2.7 2.7c.6.2 1.3.4 2.3.4.9.1 1.3.1 3.8.1s2.9 0 3.8-.1c1 0 1.7-.2 2.3-.4a4.6 4.6 0 0 0 2.7-2.7c.2-.6.4-1.3.4-2.3.1-.9.1-1.3.1-3.8s0-2.9-.1-3.8c0-1-.2-1.7-.4-2.3a4.6 4.6 0 0 0-2.7-2.7c-.6-.2-1.3-.4-2.3-.4-.9-.1-1.3-.1-3.8-.1zm0 4.6a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.9-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"/></svg>' },
    { label: 'YouTube', bg: 'linear-gradient(180deg,#FF2626 0%,#D90000 100%)', url: 'https://youtube.com/@bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M21.8 7.3a2.6 2.6 0 0 0-1.8-1.8C18.4 5 12 5 12 5s-6.4 0-8 .5a2.6 2.6 0 0 0-1.8 1.8C1.7 8.9 1.7 12 1.7 12s0 3.1.5 4.7a2.6 2.6 0 0 0 1.8 1.8c1.6.5 8 .5 8 .5s6.4 0 8-.5a2.6 2.6 0 0 0 1.8-1.8c.5-1.6.5-4.7.5-4.7s0-3.1-.5-4.7z"/><path fill="#E60000" d="M10 15.2V8.8l5.5 3.2-5.5 3.2z"/></svg>' },
    { label: 'X', bg: 'linear-gradient(180deg,#24292E 0%,#000000 100%)', url: 'https://x.com/bansifyofficial', svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { label: 'LinkedIn', bg: 'linear-gradient(180deg,#0E76A8 0%,#0A66C2 100%)', url: 'https://linkedin.com/company/bansifyofficial', svg: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M6.9 8.6H3.8V20h3.1V8.6zM5.3 3.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM20.2 13.4c0-3.3-1.8-4.8-4.1-4.8-1.9 0-2.8 1-3.2 1.8V8.6H9.9V20H13v-6c0-1.6.3-3.1 2.2-3.1 1.9 0 1.9 1.8 1.9 3.2V20h3.1v-6.6z"/></svg>' },
    { label: 'Telegram', bg: 'linear-gradient(180deg,#37BBFE 0%,#007DBB 100%)', url: 'https://t.me/bansifyofficial', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#C8DAEA" d="M9.8 17.6l-.3 4.2c.5 0 .7-.2 1-.5l2.4-2.3-3.1-1.4z"/><path fill="#A9C9DD" d="M9.8 17.6l7.3-6.7c.3-.3-.1-.4-.5-.2l-9 5.7 2.2 1.2z"/><path fill="#fff" d="M19.8 4.8L3.7 11c-1.1.4-1.1 1.1-.2 1.3l4.1 1.3 9.5-6c.5-.3.9-.1.5.2l-7.7 7-.3 4.2c.4 0 .6-.2.9-.4l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8L21.5 6c.3-1.1-.4-1.6-1.7-1.2z"/></svg>' },
    { label: 'GitHub', bg: 'linear-gradient(180deg,#2F363D 0%,#161B22 100%)', url: 'https://github.com/Bansify', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#fff" d="M12 2.2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2.2z"/></svg>' },
  ];
  var internalNavSync = false;
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function sym(name) { return '<span class="msym">' + name + '</span>'; }
  function findSection(id) {
    for (var i = 0; i < SECTIONS.length; i++) { if (SECTIONS[i].id === id) return SECTIONS[i]; }
    return SECTIONS[0];
  }
  function openAccountSheet() {
    var dockAvatar = document.querySelector('.bs-dock-avatar') || document.querySelector('.bs-profile');
    if (typeof window.__BANSIFY_OPEN_ACCOUNT_SHEET === 'function') {
      window.__BANSIFY_OPEN_ACCOUNT_SHEET(dockAvatar);
      return;
    }
    import('/widget/account-menu.js')
      .then(function (mod) {
        var controller = (mod && (mod.BansifyAccountMenu || mod.GothwadAccountMenu)) || window.BansifyAccountMenu || window.GothwadAccountMenu;
        if (!controller || typeof controller.open !== 'function') return;
        if (controller.isOpen && controller.isOpen()) {
          controller.close();
          return;
        }
        return fetch('/api/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.user) {
              controller.open(
                { user: data.user, accounts: data.accounts || [], activeId: data.activeId || null, authuser: data.authuser || 0 },
                { anchorEl: dockAvatar }
              );
            }
          });
      })
      .catch(function () {});
  }
  function selectSection(id) {
    var sec = findSection(id);
    document.body.setAttribute('data-bs-tab', sec.id);
    document.body.classList.remove('bs-mobile-open');
    internalNavSync = true;
    var target = document.querySelector('.me-nav-item[data-section="' + sec.parent + '"]');
    if (target) target.click();
    internalNavSync = false;
    syncActive(sec.id);
    var body = document.querySelector('.me-body');
    if (body) body.scrollTop = 0;
  }
  window.__BANSIFY_SELECT_TAB = selectSection;
  function syncActive(id) {
    var sec = findSection(id);
    document.body.setAttribute('data-bs-tab', sec.id);
    document.querySelectorAll('.bs-nav-item').forEach(function (btn) {
      var active = btn.dataset.section === sec.id;
      btn.classList.toggle('is-active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    var headIcon = document.getElementById('bs-card-head-icon');
    var headTitle = document.getElementById('bs-card-head-title');
    var headSub = document.getElementById('bs-card-head-sub');
    if (headIcon) headIcon.innerHTML = sym(sec.icon);
    if (headTitle) headTitle.textContent = sec.label;
    if (headSub) headSub.textContent = sec.sub;
  }
  function toggleTheme() {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) toggle.click();
    setTimeout(paintThemeIcon, 60);
  }
  function paintThemeIcon() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark');
    document.querySelectorAll('.bs-theme-inline').forEach(function (btn) { btn.innerHTML = sym(dark ? 'light_mode' : 'dark_mode'); });
  }
  function buildCardHeader() {
    var head = el('div', 'bs-card-head');
    var left = el('div', 'bs-card-head-left');
    var icon = el('span', 'bs-card-head-icon', sym('home'));
    icon.id = 'bs-card-head-icon';
    var titles = el('div', 'bs-card-head-titles');
    var title = el('div', 'bs-card-head-title', 'Home');
    title.id = 'bs-card-head-title';
    var sub = el('div', 'bs-card-head-sub', SECTIONS[0].sub);
    sub.id = 'bs-card-head-sub';
    titles.appendChild(title);
    titles.appendChild(sub);
    left.appendChild(icon);
    left.appendChild(titles);
    head.appendChild(left);
    var acctBtn = el('button', 'bs-card-acct');
    acctBtn.type = 'button';
    acctBtn.title = 'Switch Bansify Account';
    acctBtn.innerHTML = '<span class="bs-card-acct-dot"></span><span id="bs-card-acct-email">Account</span>';
    acctBtn.addEventListener('click', openAccountSheet);
    head.appendChild(acctBtn);
    return head;
  }
  function openPane(app) {
    var existing = document.querySelector('.bs-pane');
    if (existing) existing.remove();
    var pane = el('section', 'bs-pane');
    pane.setAttribute('aria-label', app.label);
    var head = el('div', 'bs-pane-head');
    var mark = el('span', 'bs-dock-app', app.icon ? sym(app.icon) : '');
    if (app.logo) mark.innerHTML = '<img src="' + app.logo + '" alt="" />';
    head.appendChild(mark);
    head.appendChild(el('span', 'bs-pane-title', app.label));
    var open = el('a', 'bs-pane-btn', sym('open_in_new'));
    open.href = app.url;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.title = 'Open in tab';
    open.setAttribute('aria-label', 'Open in a new tab');
    head.appendChild(open);
    var close = el('button', 'bs-pane-btn', sym('close'));
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      pane.remove();
      document.body.classList.remove('bs-has-pane');
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
  function syncAvatarNode(node, srcAvatar) {
    if (!node || !srcAvatar) return;
    var img = srcAvatar.querySelector('img');
    if (img && img.src) { node.innerHTML = '<img src="' + img.src + '" alt="" />'; } else { node.textContent = (srcAvatar.textContent || 'B').trim().slice(0, 1).toUpperCase() || 'B'; }
  }
  function refreshProfile() {
    var srcAvatar = document.getElementById('appbar-avatar');
    var srcName = document.getElementById('menu-name');
    var srcEmail = document.getElementById('menu-email');
    var nameText = ((srcName && srcName.textContent) || 'Account').trim() || 'Account';
    var emailText = ((srcEmail && srcEmail.textContent) || '').trim();
    var cleanEmail = emailText === '…' ? '' : emailText;
    var panelAvatar = document.querySelector('.bs-avatar');
    var dockAvatar = document.querySelector('.bs-dock-avatar');
    var mobileAvatar = document.querySelector('.bs-mobile-avatar');
    syncAvatarNode(panelAvatar, srcAvatar);
    syncAvatarNode(dockAvatar, srcAvatar);
    syncAvatarNode(mobileAvatar, srcAvatar);
    var nameNode = document.querySelector('.bs-profile-name');
    var emailNode = document.querySelector('.bs-profile-email');
    var cardAcctEmail = document.getElementById('bs-card-acct-email');
    if (nameNode) nameNode.textContent = nameText;
    if (emailNode) emailNode.textContent = cleanEmail;
    if (cardAcctEmail) cardAcctEmail.textContent = cleanEmail || nameText;
  }
  function buildPanel() {
    var panel = el('aside', 'bs-panel');
    panel.setAttribute('aria-label', 'Account navigation');
    var brand = el('div', 'bs-brand');
    var mark = el('button', 'bs-brand-mark', '<img src="/icon-192.png" alt="Bansify Accounts" />');
    mark.type = 'button';
    mark.setAttribute('aria-label', 'Toggle panel');
    mark.addEventListener('click', function () {
      document.body.classList.toggle('bs-collapsed');
      try { localStorage.setItem('bs-shell-collapsed', document.body.classList.contains('bs-collapsed') ? '1' : '0'); } catch (e) {}
    });
    brand.appendChild(mark);
    brand.appendChild(el('span', 'bs-brand-name', '<b>Bansify</b> Account'));
    var collapse = el('button', 'bs-collapse', sym('chevron_left'));
    collapse.type = 'button';
    collapse.setAttribute('aria-label', 'Collapse panel');
    collapse.addEventListener('click', function () {
      if (window.innerWidth <= 767) {
        document.body.classList.remove('bs-mobile-open');
        return;
      }
      document.body.classList.add('bs-collapsed');
      try { localStorage.setItem('bs-shell-collapsed', '1'); } catch (e) {}
    });
    brand.appendChild(collapse);
    panel.appendChild(brand);
    var nav = el('nav', 'bs-nav');
    SECTIONS.forEach(function (section) {
      var btn = el('button', 'bs-nav-item', sym(section.icon) + '<span>' + section.label + '</span>');
      btn.type = 'button';
      btn.dataset.section = section.id;
      btn.title = section.label;
      btn.addEventListener('click', function () { selectSection(section.id); });
      nav.appendChild(btn);
    });
    panel.appendChild(nav);
    var footer = el('div', 'bs-footer');
    footer.appendChild(el('div', 'bs-divider'));
    var expandWrap = el('div', 'bs-expand-wrap');
    var expandBtn = el('button', 'bs-expand-btn', sym('chevron_right'));
    expandBtn.type = 'button';
    expandBtn.title = 'Expand panel';
    expandBtn.setAttribute('aria-label', 'Expand panel');
    expandBtn.addEventListener('click', function () {
      document.body.classList.remove('bs-collapsed');
      try { localStorage.setItem('bs-shell-collapsed', '0'); } catch (e) {}
    });
    expandWrap.appendChild(expandBtn);
    footer.appendChild(expandBtn ? expandWrap : expandWrap);
    var profile = el('button', 'bs-profile');
    profile.type = 'button';
    profile.title = 'Switch or manage Bansify Account';
    var avatar = el('span', 'bs-avatar', 'B');
    var text = el('span', 'bs-profile-text');
    text.appendChild(el('span', 'bs-profile-name', 'Account'));
    text.appendChild(el('span', 'bs-profile-email', ''));
    var theme = el('span', 'bs-theme-inline', sym('dark_mode'));
    theme.setAttribute('role', 'button');
    theme.setAttribute('tabindex', '0');
    theme.setAttribute('aria-label', 'Toggle theme');
    theme.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleTheme();
    });
    profile.appendChild(avatar);
    profile.appendChild(text);
    profile.appendChild(theme);
    profile.addEventListener('click', openAccountSheet);
    footer.appendChild(profile);
    panel.appendChild(footer);
    return panel;
  }
  function buildTop() {
    var top = el('div', 'bs-top');
    var search = el('div', 'bs-search');
    var menuBtn = el('button', 'bs-mobile-menu', sym('menu'));
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label', 'Open navigation');
    menuBtn.addEventListener('click', function () { document.body.classList.toggle('bs-mobile-open'); });
    search.appendChild(menuBtn);
    search.insertAdjacentHTML('beforeend', sym('search'));
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search account settings (Ctrl+K)';
    input.setAttribute('aria-label', 'Search account settings');
    var resultsBox = el('div', 'bs-search-results hidden');
    function closeSearch() {
      resultsBox.classList.add('hidden');
      resultsBox.innerHTML = '';
    }
    function activateSearchItem(item) {
      closeSearch();
      input.value = '';
      selectSection(item.tab);
      setTimeout(function () {
        if (item.clickId) {
          var btn = document.getElementById(item.clickId);
          if (btn) btn.click();
        } else if (item.dialog) {
          var row = document.querySelector('[data-shell-tab="' + item.tab + '"] [data-dialog="' + item.dialog + '"]');
          if (row) {
            var details = row.closest('details');
            if (details) details.open = true;
            row.click();
          }
        } else if (item.focusId) {
          var target = document.getElementById(item.focusId);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
    }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        closeSearch();
        return;
      }
      var tokens = q.split(/\s+/);
      var matches = SEARCH_ITEMS.filter(function (item) {
        var hay = (item.title + ' ' + item.sub + ' ' + item.kw).toLowerCase();
        return tokens.every(function (t) { return hay.indexOf(t) !== -1; });
      }).slice(0, 7);
      resultsBox.innerHTML = '';
      if (!matches.length) { resultsBox.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--bs-muted);">No matching settings found.</div>'; } else {
        matches.forEach(function (item) {
          var opt = el(
            'button',
            'bs-search-option',
            sym(item.icon) +
              '<span><span class="bs-search-option-title">' +
              item.title +
              '</span><span class="bs-search-option-sub">' +
              item.sub +
              '</span></span>'
          );
          opt.type = 'button';
          opt.addEventListener('click', function () { activateSearchItem(item); });
          resultsBox.appendChild(opt);
        });
      }
      resultsBox.classList.remove('hidden');
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSearch(); } else if (e.key === 'Enter') {
        var first = resultsBox.querySelector('.bs-search-option');
        if (first && !resultsBox.classList.contains('hidden')) {
          e.preventDefault();
          first.click();
        }
      }
    });
    document.addEventListener('click', function (e) { if (!search.contains(e.target)) closeSearch(); });
    search.appendChild(input);
    var mobileAvatar = el('button', 'bs-mobile-avatar', 'B');
    mobileAvatar.type = 'button';
    mobileAvatar.title = 'Switch or manage Bansify Account';
    mobileAvatar.setAttribute('aria-label', 'Account');
    mobileAvatar.addEventListener('click', openAccountSheet);
    search.appendChild(mobileAvatar);
    search.appendChild(resultsBox);
    top.appendChild(search);
    var social = el('div', 'bs-social');
    SOCIAL.forEach(function (item) {
      var link = el('a', null, item.svg);
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = item.label + ' · @bansifyofficial';
      link.setAttribute('aria-label', item.label + ' @bansifyofficial');
      link.style.background = item.bg;
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
    avatar.title = 'Switch or manage Bansify Account';
    avatar.setAttribute('aria-label', 'Account');
    avatar.addEventListener('click', openAccountSheet);
    dock.appendChild(avatar);
    dock.appendChild(el('div', 'bs-dock-divider'));
    APPS.forEach(function (app) {
      var button = el('button', 'bs-dock-app');
      button.type = 'button';
      button.title = app.label;
      button.setAttribute('aria-label', 'Open ' + app.label);
      var logo = app.url.replace(/\/+$/, '') + '/icon-192.png';
      var img = document.createElement('img');
      img.src = logo;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = function () { button.innerHTML = app.svg || sym(app.icon); };
      button.appendChild(img);
      app.logo = logo;
      button.addEventListener('click', function () { openPane(app); });
      dock.appendChild(button);
      dock.appendChild(el('div', 'bs-dock-divider'));
    });
    return dock;
  }
  function init() {
    var root = document.getElementById('dash-root');
    if (!root) return;
    document.body.classList.add('bs-shell-on');
    document.body.setAttribute('data-bs-tab', 'home');
    root.insertBefore(buildCardHeader(), root.firstChild);
    var backdrop = el('div', 'bs-drawer-backdrop');
    backdrop.addEventListener('click', function () { document.body.classList.remove('bs-mobile-open'); });
    document.body.appendChild(backdrop);
    document.body.appendChild(buildPanel());
    document.body.appendChild(buildTop());
    document.body.appendChild(buildDock());
    try {
      if (localStorage.getItem('bs-shell-collapsed') === '1') { document.body.classList.add('bs-collapsed'); }
    } catch (e) {}
    document.querySelectorAll('.me-nav-item[data-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!internalNavSync) { syncActive(btn.dataset.section); }
      });
    });
    document.addEventListener(
      'click',
      function (e) {
        var jump = e.target.closest('[data-goto-shell]');
        if (jump && jump.dataset.gotoShell) {
          var targetTab = jump.dataset.gotoShell;
          setTimeout(function () { syncActive(targetTab); }, 0);
        }
      },
      true
    );
    syncActive('home');
    refreshProfile();
    window.addEventListener('bansify-user-updated', refreshProfile);
    setInterval(refreshProfile, 1500);
    paintThemeIcon();
    setInterval(paintThemeIcon, 1500);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
