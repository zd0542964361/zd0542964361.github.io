// שומר את קבצי האפליקציה לעבודה בלי אינטרנט, ומקבל הקלטות שמשתפים מוואטסאפ.
const CACHE = 'tamlul-20261125234830';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-48.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // מוחקים רק מטמונים ישנים של תמלול בכיף, לא של אפליקציות אחרות באותו אתר
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tamlul-') && k !== CACHE && k !== 'tamlul-share').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const files = fd.getAll('audio').filter(f => f && f.size);
        const f = files[0];
        if (f) {
          const c = await caches.open('tamlul-share');
          await c.put('./shared-audio', new Response(f, { headers: { 'content-type': f.type || 'audio/ogg', 'x-name': encodeURIComponent(f.name || 'voice.ogg') } }));
          return Response.redirect('./?shared=1', 303);
        }
      } catch (err) { /* נופלים להודעה למטה */ }
      return Response.redirect('./?shared=0', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // קודם מהרשת (כדי לקבל עדכונים), ובלי אינטרנט מהמטמון
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && url.pathname.startsWith(self.registration.scope.replace(location.origin, ''))) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
