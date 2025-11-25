const CACHE = 'sw-cache-v1-20251124';
const ASSET_PATTERNS = [
  /\/assets\//,
  /^https:\/\/justanassetfolder\.netlify\.app\//
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function shouldCache(req) {
  try {
    const url = req.url;
    if (req.method !== 'GET') return false;
    return ASSET_PATTERNS.some(p => p.test(url));
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!shouldCache(req)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then(res => {
      try { if (res && res.status === 200) cache.put(req, res.clone()); } catch {}
      return res;
    }).catch(() => cached || Promise.reject());
    return cached || fetchPromise;
  })());
});