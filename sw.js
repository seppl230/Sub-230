const CACHE='road230-cache-6.1';
const ASSETS=['./','./index.html','./styles.css?v=6.1','./app.js?v=6.1','./manifest.webmanifest?v=6.1','./icon-sub230-192.png','./icon-sub230-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(url.origin!==self.location.origin||e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}return resp}).catch(()=>caches.match(e.request)))})
