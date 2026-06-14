/* Service worker — Le Sillage des Morts
   Stratégie mixte :
   - Fichiers du jeu (même origine) → RÉSEAU D'ABORD : tu vois toujours la dernière
     version après un ré-upload, et repli sur le cache si hors-ligne.
   - Ressources externes (Three.js CDN, polices, MP3 distants) → CACHE D'ABORD :
     mises en cache une fois, puis dispo hors-ligne. */
const CACHE = 'sdm-cache-v2';
const CORE = [
  'index_V2.html',
  'manifest.webmanifest',
  'lib/jsQR.js',
  'lib/icon.svg'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(CORE.map(u => c.add(u).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    // Réseau d'abord : dernière version si en ligne, sinon cache.
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index_V2.html') : Response.error()))
      )
    );
  } else {
    // Cache d'abord : ressources externes stables.
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => Response.error()))
    );
  }
});
