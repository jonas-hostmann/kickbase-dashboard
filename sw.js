/* sw.js – minimaler Offline-Support für die Kickbase-Zentrale.
   Strategie: App-Shell (index.html, Manifest, Icons) cache-first,
   data.json network-first mit Cache-Fallback (letzte Daten offline). */

const CACHE = "kickbase-zentrale-v1";
const SHELL = ["./index.html", "./manifest.webmanifest", "./icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith("/data.json")) {
    // Daten: network-first, Fallback = letzter Cache-Stand
    event.respondWith(
      fetch(event.request).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put("./data.json", clone));
        return resp;
      }).catch(() => caches.match("./data.json"))
    );
    return;
  }
  // Shell: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
