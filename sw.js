/* Horizonte — funciona sem internet. Os dados nunca passam por aqui: ficam no aparelho. */
const CACHE = 'horizonte-v10';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'js/core.js', 'js/ui.js', 'js/app.js', 'js/views-finance.js', 'js/views-goals.js', 'js/views-saved.js', 'js/import.js', 'js/extras.js', 'js/pdf.js', 'js/vendor/pdf.min.js', 'js/vendor/pdf.worker.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('dados-locais.js')) return;
  /* rede primeiro (pega a versão nova); sem internet, usa a cópia guardada */
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
