
const CACHE = "ltrain2k-v1";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

// Installation und Zwischenspeicherung
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(FILES)
    )
  );

  self.skipWaiting();
});

// Aktivierung und Bereinigung alter Caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

// Offline-fähiger Seitenaufruf
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(hit => {
      if (hit) return hit;

      return fetch(event.request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE).then(cache =>
            cache.put(event.request, copy)
          );

          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
