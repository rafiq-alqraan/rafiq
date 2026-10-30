const C='rafiq-v5', KEEP=['rafiq-quran','rafiq-fonts'], FILES=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C && !KEEP.includes(k)).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return; const u=new URL(e.request.url);
  // fonts rarely change: cache first, so the mushaf looks right offline
  if(u.host==='fonts.googleapis.com' || u.host==='fonts.gstatic.com'){
    e.respondWith(caches.open('rafiq-fonts').then(c=>c.match(e.request).then(hit=>hit || fetch(e.request).then(r=>{ if(r.ok||r.type==='opaque') c.put(e.request,r.clone()); return r; })))); return; }
  if(u.origin!==location.origin) return; // accounts traffic goes straight to Firebase
  // the mushaf text never changes: serve it from the cache once saved
  if(u.pathname.endsWith('/quran.json')){
    e.respondWith(caches.open('rafiq-quran').then(c=>c.match(u.href).then(hit=>hit || fetch(e.request).then(r=>{ if(r.ok) c.put(u.href,r.clone()); return r; })))); return; }
  // network first, so updates show up; the cache keeps it working offline
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); } return r; })
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html')))); });
