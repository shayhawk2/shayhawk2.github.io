/* Hoops Planner offline cache. Network first (3 s timeout) so updates show up; falls back to the cached copy with no signal. Bump C to force a fresh cache. */
const C = "hoops-v3";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(C);
    const net = fetch(e.request).then(r => {
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    });
    net.catch(() => {});
    try {
      return await Promise.race([net, new Promise((_, no) => setTimeout(no, 3000))]);
    } catch (_) {
      const hit = (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match("./"));
      return hit || net;
    }
  })());
});
