// Cache-first service worker: the app works offline, and so do map areas you've already seen.
const CACHE = 'meridian-533de3bfd16e';
const TILES = 'meridian-tiles';
const CORE = ["./","index.html","geo-live.json","maplibre-gl.js","manifest.webmanifest","icon.svg","icon-180.png","icon-192.png","icon-512.png"];
const isTile = url => /arcgis(online)?\.com/.test(url);
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Keep at most about 4000 tiles.
let trimming = false;
function trim(c) {
  if (trimming) return; trimming = true;
  c.keys().then(keys => Promise.all(keys.slice(0, Math.max(0, keys.length - 4000)).map(k => c.delete(k)))).finally(() => { trimming = false; });
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const tile = isTile(e.request.url);
  e.respondWith(caches.match(e.request, { ignoreSearch: !tile }).then(hit => {
    if (hit) return hit;
    return fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(tile ? TILES : CACHE).then(c => c.put(e.request, copy).then(() => tile && trim(c)));
      }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : Response.error());
  }));
});
