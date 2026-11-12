// Sisies Boutique Studio — service worker (v2)
// - App page: network first, so updates arrive immediately; cached copy when offline.
// - Fonts and product photos: cached, so the sell screen still looks right with no signal.
// - Supabase and the website catalog: never cached (always live data).
const CACHE = 'sisies-v2-1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const ASSET_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.shopify.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Page navigations: network first, fall back to cache.
  if (req.mode === 'navigate' && sameOrigin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Same-origin files, fonts and product photos: stale-while-revalidate.
  if (sameOrigin || ASSET_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
  // Everything else (Supabase, sisieseg.com catalog) goes straight to the network.
});
