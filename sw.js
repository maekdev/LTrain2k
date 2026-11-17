
const CACHE = "ltrain2k-v1";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./apple-touch-icon.png"
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
          .filter(k => k.startsWith("ltrain2k-") && k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

// Ermöglicht ein manuelles Aktualisieren des App-Caches auch ohne SW-Änderung.
self.addEventListener("message", event => {
  if (event.data?.type !== "UPDATE_CACHE") return;

  const replyPort = event.ports[0];
  event.waitUntil((async () => {
    try {
      const requests = FILES.map(file =>
        new Request(new URL(file, self.registration.scope), { cache: "reload" })
      );
      const responses = await Promise.all(requests.map(request => fetch(request)));
      const failedResponse = responses.find(response => !response.ok);
      if (failedResponse) {
        throw new Error(`Datei konnte nicht geladen werden: HTTP ${failedResponse.status}`);
      }

      const cache = await caches.open(CACHE);
      await Promise.all(
        responses.map((response, index) => cache.put(requests[index], response))
      );
      replyPort?.postMessage({ ok: true });
    } catch (error) {
      replyPort?.postMessage({
        ok: false,
        error: error.message || "Die Dateien konnten nicht geladen werden."
      });
    }
  })());
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
