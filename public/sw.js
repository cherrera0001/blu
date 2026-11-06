/* Blu — service worker de app shell (specs/018, BLU-1503).
 * Mínimo viable: precache del shell + runtime cache-first mismo-origen.
 *
 * ATENCIÓN: esta política DUPLICA a src/lib/pwa/sw-policy.ts (servido verbatim,
 * sin bundler). El test src/lib/pwa/sw-sync.test.ts exige que coincidan.
 *
 * Privacidad: /api/* (asistente y voz) jamás se cachea; ninguna conversación
 * queda almacenada. Cross-origin y no-GET pasan directo a la red.
 */
const CACHE_NAME = "blu-shell-v2";
const PRECACHE_URLS = [
  "/",
  "/cuestionario",
  "/blu-newspaper.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith("blu-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
