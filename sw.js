const CACHE = 'webllm-pwa-static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/main.tsx',
  // CDN module (optional). If CORS issues occur, bundling via Vite is recommended.
  'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/lib/index.js'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', evt => evt.waitUntil(self.clients.claim()));
self.addEventListener('fetch', evt => {
  const reqUrl = new URL(evt.request.url);
  if (ASSETS.includes(reqUrl.pathname) || evt.request.url.includes('cdn.jsdelivr.net')) {
    evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request)));
  }
});
