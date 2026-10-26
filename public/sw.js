// RedixFi service worker: caches ONLY the static app shell (the offline page, the icons and the manifest).
//
// It never caches, and never answers from a cache, any price, score, news, API response, page HTML or user data:
// every other request goes straight to the network exactly as if no service worker existed, so "Live" and "as of"
// labels always describe fresh data. Logins, payments, the sitemap and the pages search engines read are untouched
// (the worker does not intercept them at all). The one thing it does for a page request is show the offline page when the
// network is unreachable.
//
// Versioning: change CACHE_VERSION on a release that changes this list; the activate step deletes every other
// RedixFi cache, so an old shell never lingers.
const CACHE_VERSION = "shell-v1";
const CACHE = "redixfi-" + CACHE_VERSION;
const SHELL = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/branding/redixfi-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("redixfi-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // the API and every other host: untouched

  // a page request: always the network; only when it fails, the offline page
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // the shell files themselves (icons, offline page): cache first. Nothing else is ever answered from the cache.
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
