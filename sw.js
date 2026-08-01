const CACHE = 'kayak-depth-v12';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './depth_data.bin',
  './contours.bin',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const isHtml = event.request.mode === 'navigate' ||
    event.request.url.endsWith('/') || event.request.url.endsWith('index.html');

  if (isHtml) {
    // 本体HTMLはネット優先。海上で圏外の時だけキャッシュにフォールバック。
    // GitHub PagesがCache-Control: max-age=600を返すため、既定のfetchだと
    // ブラウザのHTTPキャッシュ経由で10分間古い内容が返ることがある。
    // no-storeで明示的にネットワークから取り直す。
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((res) => {
          caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // データ・画像類は変化しないのでキャッシュ優先
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
