const CACHE='foozix-live-5.0.23-single-layer-drawer';
const SHELL=['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./assets/brand/arte-divino-approved-transparent.png','./assets/brand/foozix-f-approved-transparent.png','./assets/brand/sidebar-circuit-background-approved.png','./assets/brand/sidebar-circuit-background-transparent.png','./assets/brand/opening-screen-circuit-background-approved.png','./assets/brand/super-foozi-transparent-v2.png','./assets/profiles/khaled.png','./assets/profiles/sherif.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    const root=new URL('./',self.location.href).pathname,isShell=url.pathname===root||url.pathname===root+'index.html';
    event.respondWith(fetch(new Request(event.request,{cache:'no-store'})).then(response=>{
      if(isShell&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy))}
      return response;
    }).catch(async()=>{
      const cached=isShell?await caches.match('./index.html'):null;
      return cached||new Response('Connection unavailable. Please retry.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response;
  })));
});
