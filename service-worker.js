// Improved service-worker.js (versioned, offline fallback, network-first for Sheets API)
const CACHE_NAME = 'ranking-cache-v3';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  OFFLINE_URL,
  // add logo to precache if public
  'https://raw.githubusercontent.com/ittokki/Futebol/ba59ab86cf2095d4e9214bd5e24e21ac8aeaf33a/inimigos%20da%20bola.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for Google Sheets API (try network, fallback to cache)
  if (url.hostname.includes('sheets.googleapis.com')) {
    event.respondWith(
      fetch(req).then(response => {
        // update cache
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // For navigation requests, try network then fallback to cache then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(resp => {
        // update cache
        caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // For other requests (assets), try cache then network, then offline fallback
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkResp => {
        // store in cache for next time
        if (networkResp && networkResp.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(req, networkResp.clone()));
        }
        return networkResp;
      }).catch(() => {
        // if it's an image, return a lightweight placeholder response
        if (req.destination === 'image') {
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="20">Offline</text></svg>', { headers: { 'Content-Type': 'image/svg+xml' }});
        }
        return caches.match(OFFLINE_URL);
      });
    })
  );
});
