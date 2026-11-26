/* Bansify Accounts PWA & Trusted Web Activity (TWA) Service Worker */
var CACHE_NAME = 'bansify-accounts-shell-v65';
var STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) return caches.delete(key);
            return null;
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.indexOf('/api/') === 0 ||
    url.pathname.indexOf('/auth/') === 0 ||
    url.pathname.indexOf('/oauth/') === 0 ||
    url.pathname.indexOf('/.well-known/') === 0
  ) {
    return;
  }
  if (STATIC_ASSETS.indexOf(url.pathname) !== -1) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return (
          cached ||
          fetch(req).then(function (res) {
            if (res && res.status === 200) {
              var copy = res.clone();
              caches.open(CACHE_NAME).then(function (c) {
                c.put(req, copy);
              });
            }
            return res;
          })
        );
      })
    );
  }
});
