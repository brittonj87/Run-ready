const CACHE = 'runready-v3';
const ASSETS = ['./index.html','./data.js','./app.js','./manifest.json','./icon.svg',
  './images/squat.png','./images/squat_thumb.png',
  './images/lunge.png','./images/lunge_thumb.png',
  './images/glutebridge.png','./images/glutebridge_thumb.png',
  './images/wallsit.png','./images/wallsit_thumb.png',
  './images/calfraise.png','./images/calfraise_thumb.png',
  './images/st_quad.png','./images/st_quad_thumb.png',
  './images/st_hamstring.png','./images/st_hamstring_thumb.png',
  './images/st_calf.png','./images/st_calf_thumb.png',
  './images/st_hipflexor.png','./images/st_hipflexor_thumb.png',
  './images/st_glute.png','./images/st_glute_thumb.png',
  './images/st_itband.png','./images/st_itband_thumb.png',
  './images/st_butterfly.png','./images/st_butterfly_thumb.png',
  './images/st_downdog.png','./images/st_downdog_thumb.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(cached=>cached || fetch(e.request).catch(()=>cached))
  );
});
