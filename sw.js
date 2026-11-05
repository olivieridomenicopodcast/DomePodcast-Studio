// Service worker: l'app funziona offline e si aggiorna da sola.
// Strategia "stale-while-revalidate": risponde subito dalla cache e intanto scarica la versione nuova.
// Se aggiungi file nuovi usati dall'app (anche in brand/), aggiungili alla lista FILE.
const CACHE = 'domepodcast-studio-v1';
const FILE = [
  './', 'index.html', 'manifest.webmanifest',
  'app/app.css', 'app/app.js', 'app/layouts.js', 'app/elementi.js', 'app/render.js', 'app/zip.js', 'app/idb.js', 'app/build.js',
  'app/util.js', 'app/portfolio.js', 'app/portfolio-sito.js', 'app/storia.js', 'portfolio/stile.css',
  'assets/brand.css',
  'brand/logo/ufficiale/logo-ufficiale.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'fonts/Staatliches-Regular.ttf', 'fonts/LibreBaskerville-var.ttf',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.searchParams.has('check')) return; // controllo aggiornamenti: sempre dalla rete
  ev.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const rete = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || rete;
    }),
  );
});
