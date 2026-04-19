// Splitwise Service Worker
const STATIC_CACHE = "splitwise-static-v1";
const PAGE_CACHE = "splitwise-pages-v1";

// Paths to serve with stale-while-revalidate (show cached instantly, refresh in bg)
function isCacheablePage(pathname) {
  return (
    pathname === "/dashboard" ||
    pathname === "/groups" ||
    pathname === "/help" ||
    pathname.startsWith("/groups/")
  );
}

// ── Install: pre-cache offline fallback ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(["/offline.html"]))
  );
  self.skipWaiting();
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests; skip API and Next.js internals
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return;
  }

  // ── Page navigations ─────────────────────────────────────────────────────
  if (request.mode === "navigate") {
    if (isCacheablePage(url.pathname)) {
      // Stale-while-revalidate: return cached HTML immediately,
      // fetch fresh copy in the background and update the cache.
      event.respondWith(
        caches.open(PAGE_CACHE).then(async (cache) => {
          const cached = await cache.match(request);

          // Background fetch — always run regardless of cache hit
          const fetchPromise = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
            .catch(() => null);

          if (cached) {
            // Serve stale immediately, revalidate in background
            event.waitUntil(fetchPromise);
            return cached;
          }

          // No cached copy yet — wait for network
          const res = await fetchPromise;
          return (
            res ||
            caches
              .match("/offline.html")
              .then((r) => r ?? new Response("Offline", { status: 503 }))
          );
        })
      );
      return;
    }

    // Other pages (signin, join) — network-first, offline fallback
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline.html")
          .then((r) => r ?? new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // ── Icons — cache-first ───────────────────────────────────────────────────
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
  }
});
