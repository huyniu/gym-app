// Network-first with cache fallback: always gets updates when online, works offline at the gym.
importScripts('data.js'); // for EX_DB / exSlug: pre-cache every exercise image so demos work offline
const CACHE = 'gymlog-v7';
const ASSETS = ['./', './index.html', './data.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  ...EX_DB.filter(([n]) => !NO_IMG.includes(n)).flatMap(([n]) => [0, 1].map(k => `./img/ex/${exSlug(n)}-${k}.jpg`))];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
