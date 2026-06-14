/* Service worker — Le Sillage des Morts
   Stratégie : précache des fichiers locaux essentiels, puis cache-first
   avec mise en cache à la volée (Three.js CDN, MP3 de doublage, polices…).
   => Après un premier chargement EN LIGNE, le jeu fonctionne hors-ligne. */
const CACHE = 'sdm-cache-v1';
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
      // on ajoute un par un pour qu'un fichier manquant ne casse pas tout
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
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // on met en cache toute réponse exploitable (y compris CDN opaques)
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // hors-ligne : repli sur la page principale pour les navigations
        if (req.mode === 'navigate') return caches.match('index_V2.html');
        return Response.error();
      });
    })
  );
});
