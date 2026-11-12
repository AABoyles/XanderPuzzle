// Service worker template. The build plugin replaces the placeholders below. Plain JS, relative URLs only.
const CACHE = '__CACHE_NAME__';
const PRECACHE = __PRECACHE__;
const PREFIX = 'shiftbound-';

const SHELL = /(^|\/)(index\.html|manifest\.webmanifest|sw\.js)$/;
function networkFirst(pathname, isNav) {
  return isNav || pathname === '' || pathname.endsWith('/') || SHELL.test(pathname);
}

self.addEventListener('install', (event) => {
  const base = self.registration.scope;
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(new URL(p, base).href, { cache: 'reload' })))),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n.startsWith(PREFIX) && n !== CACHE).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const isNav = req.mode === 'navigate';
  if (networkFirst(url.pathname, isNav)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(isNav ? new URL('./', self.registration.scope).href : req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then((r) => r || caches.match(new URL('./', self.registration.scope).href)),
        ),
    );
  } else {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
