// Bộ nhớ đệm để website mở được cả khi không có mạng.
const CACHE = "so-chi-tieu-v13";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    // Luôn lấy bản mới nhất khi có mạng (chờ tối đa 3 giây), mất mạng thì mở bản đã lưu.
    e.respondWith(caches.open(CACHE).then(async c => {
      const net = fetch(req, { cache: "no-store" }).then(res => { if (res.ok) c.put("./index.html", res.clone()); return res; });
      const timeout = new Promise(r => setTimeout(r, 3000));
      try {
        const res = await Promise.race([net, timeout.then(() => null)]);
        if (res) return res;
      } catch (_) {}
      const hit = await c.match("./index.html");
      return hit || net;
    }));
    return;
  }
  // Font và các file tĩnh: dùng bản đã lưu, đồng thời cập nhật ngầm.
  if (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com") || url.hostname === "cdn.jsdelivr.net" || url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
