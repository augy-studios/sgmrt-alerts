// Bump on every deploy that changes anything this worker serves. The browser
// compares this file byte for byte, so an unchanged version means no update
// reaches anybody and the update bar never appears.
const CACHE = "sgma-v14";

const ASSETS = [
  "/",
  "/index.html",
  "/404.html",
  "/style.css",
  "/404.css",
  "/script.js",
  "/js/theme.js",
  "/js/icons.js",
  "/js/ui.js",
  "/js/update-bar.js",
  "/SGMA-main.png",
  "/SGMA-192.png",
  "/SGMA-512.png",
  "/favicon.ico",
  "/manifest.json"
];

// No skipWaiting() here. A new worker installs and then waits until somebody
// presses Reload in the update bar.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

// No clients.claim() here either, for the same reason.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("message", (event) => {
  const type = typeof event.data === "string" ? event.data : event.data?.type;

  // The only place either of these is ever called.
  if (type === "skip-waiting") {
    event.waitUntil(self.skipWaiting().then(() => self.clients.claim()));
  }
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
