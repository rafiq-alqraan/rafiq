const C='rafiq-v2', FILES=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))); self.clients.claim(); });
// network first, so updates show up; the cache keeps it working offline
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET' || new URL(e.request.url).origin!==location.origin) return; // accounts traffic goes straight to Firebase
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok && new URL(e.request.url).origin===location.origin){ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); } return r; })
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html')))); });
