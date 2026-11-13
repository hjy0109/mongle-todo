// Minimal offline shell: network first, fall back to cache.
const C = 'mongle-shell-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\.apk$|version\.json$/.test(u.pathname)) return;
  // hashed build files never change: serve them from cache first
  if (u.pathname.includes('/assets/')) { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { const copy = n.clone(); caches.open(C).then(c => c.put(e.request, copy)); return n; }))); return; }
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
