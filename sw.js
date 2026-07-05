const CACHE = 'runready-v4';
const ASSETS = ['./index.html','./data.js','./app.js','./manifest.json','./icon.svg',
  './squat.png','./squat_thumb.png',
  './lunge.png','./lunge_thumb.png',
  './glutebridge.png','./glutebridge_thumb.png',
  './wallsit.png','./wallsit_thumb.png',
  './calfraise.png','./calfraise_thumb.png',
  './st_quad.png','./st_quad_thumb.png',
  './st_hamstring.png','./st_hamstring_thumb.png',
  './st_calf.png','./st_calf_thumb.png',
  './st_hipflexor.png','./st_hipflexor_thumb.png',
  './st_glute.png','./st_glute_thumb.png',
  './st_itband.png','./st_itband_thumb.png',
  './st_butterfly.png','./st_butterfly_thumb.png',
  './st_downdog.png','./st_downdog_thumb.png'
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
