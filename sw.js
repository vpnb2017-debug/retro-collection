const CACHE_NAME = 'retro-collection-v12';
const ASSETS = [
    './',
    './index.html',
    './css/variables.css',
    './css/style.css',
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
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
