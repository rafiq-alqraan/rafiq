// test page only: adds cross-origin isolation headers so the speech model can use several CPU cores
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{ const r=e.request; if(new URL(r.url).origin!==location.origin) return;
  e.respondWith(fetch(r).then(res=>{ if(!res||res.status===0) return res; const h=new Headers(res.headers); h.set('Cross-Origin-Embedder-Policy','require-corp'); h.set('Cross-Origin-Opener-Policy','same-origin'); h.set('Cross-Origin-Resource-Policy','same-origin'); return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h}); })); });
