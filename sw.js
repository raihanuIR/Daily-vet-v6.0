/* DailyVet Service Worker — static asset cache for faster repeat visits */
const CACHE = 'dv-static-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/home.html',
  '/css/style.css',
  '/css/navbar.css',
  '/css/home.css',
  '/css/index.css',
  '/css/responsive.css',
  '/css/skeleton.css',
  '/assets/dailyvet.png',
  '/js/console-guard.js',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/dailyvet-nav.js',
  '/js/dv-fast-fetch.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Cache-first for static assets
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|svg|woff2?|geojson)$/) || url.pathname.startsWith('/data/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        if (hit) return hit;
        return fetch(e.request).then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        }).catch(() => hit);
      })
    );
    return;
  }
  // Network-first for HTML / API
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok && (url.pathname.endsWith('.html') || url.pathname === '/')) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request).then((h) => h || caches.match('/index.html')))
  );
});
