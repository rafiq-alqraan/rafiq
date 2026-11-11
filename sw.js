const C='rafiq-v7', KEEP=['rafiq-quran','rafiq-fonts','rafiq-aud','rafiq-flags'], FILES=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C && !KEEP.includes(k)).map(k=>caches.delete(k))))); self.clients.claim(); });
// cross-origin isolation, only for people who turned on the Quran recitation corrector (lets it use several CPU cores)
let COI=null;
const coiGet=()=>COI!==null?Promise.resolve(COI):caches.open('rafiq-flags').then(c=>c.match('coi')).then(r=>(COI=!!r)).catch(()=>(COI=false));
self.addEventListener('message',e=>{ const d=e.data||{}; if(!('coi' in d)) return; COI=!!d.coi;
  e.waitUntil(caches.open('rafiq-flags').then(c=>COI?c.put('coi',new Response('1')):c.delete('coi')).then(()=>{ if(e.source) e.source.postMessage({coiSet:COI}); })); });
const coiWrap=r=>coiGet().then(on=>{ if(!on||!r||r.type==='opaque'||!r.status) return r; const h=new Headers(r.headers);
  h.set('Cross-Origin-Opener-Policy','same-origin'); h.set('Cross-Origin-Embedder-Policy',/Chrome\/|Firefox\//.test(self.navigator.userAgent)?'credentialless':'require-corp');
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h}); });
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return; const u=new URL(e.request.url);
  // fonts rarely change: cache first, so the mushaf looks right offline
  if(u.host==='fonts.googleapis.com' || u.host==='fonts.gstatic.com'){
    e.respondWith(caches.open('rafiq-fonts').then(c=>c.match(e.request).then(hit=>hit || fetch(e.request).then(r=>{ if(r.ok||r.type==='opaque') c.put(e.request,r.clone()); return r; })))); return; }
  // recitations saved for offline listening
  if(u.host==='everyayah.com' && !navigator.onLine){ e.respondWith(caches.open('rafiq-aud').then(c=>c.match(e.request.url).then(hit=>hit || fetch(e.request)))); return; }
  if(u.origin!==location.origin) return; // accounts traffic goes straight to Firebase
  // the mushaf text never changes: serve it from the cache once saved
  if(u.pathname.endsWith('/quran.json')){
    e.respondWith(caches.open('rafiq-quran').then(c=>c.match(u.href).then(hit=>hit || fetch(e.request).then(r=>{ if(r.ok) c.put(u.href,r.clone()); return r; })))); return; }
  // network first, so updates show up; the cache keeps it working offline
  const nav=e.request.mode==='navigate';
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); } return r; })
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))).then(r=>nav?coiWrap(r):r)); });
