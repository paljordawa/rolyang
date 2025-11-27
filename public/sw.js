const CACHE_NAME = 'audiobook-cache-v2';
const ASSETS = ['/', '/index.html', '/styles.css', '/cover-placeholder.png', '/illustration.png'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.destination === 'audio') {
    ev.respondWith(fetch(ev.request).catch(() => caches.match(ev.request)));
    return;
  }
  ev.respondWith(caches.match(ev.request).then((resp) => resp || fetch(ev.request)));
});
