// Bộ nhớ đệm để website mở được cả khi không có mạng.
const CACHE = "so-chi-tieu-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

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
  // Trang chính: ưu tiên bản mới từ mạng, mất mạng thì dùng bản đã lưu.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { caches.open(CACHE).then(c => c.put("./index.html", res.clone())); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  // Font và các file tĩnh: dùng bản đã lưu, đồng thời cập nhật ngầm.
  if (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
