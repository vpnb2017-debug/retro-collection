const CACHE_NAME = 'retro-collection-v49';
const ASSETS = [
    './',
    './index.html',
    './css/variables.css',
    './js/app.js',
    './js/services/db.js',
    './js/services/platforms.js',
    './js/services/coverSearch.js',
    './js/services/webuyService.js',
    './js/services/localFileSync.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Pre-caching v31');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
