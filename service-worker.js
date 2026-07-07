/**
 * TripSplit Service Worker
 * Handles offline caching and sync
 */

const CACHE_NAME = 'tripsplit-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: cache assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {
      // Nếu cache fail (asset không found), không cần throw error
      // Service Worker sẽ vẫn install, chỉ cache asset nào có được
      return caches.open(CACHE_NAME);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests (POST to API, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Skip Google API calls
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  // For document/script/style: cache first, fallback to network
  e.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;
      
      return fetch(request)
        .then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => {
          // If both cache and network fail, return offline page (or empty response)
          // For now, just return a network error response
          return new Response('Offline - Unable to load', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});
