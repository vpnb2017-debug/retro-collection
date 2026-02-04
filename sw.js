const CACHE_NAME = 'retro-collection-v105';
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
    './js/services/metadataService.js',
    './js/services/cloudSyncService.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Pre-caching v105');
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
    const url = new URL(event.request.url);

    // Dynamic Caching for Images (CDN Logos & Static Assets)
    if (url.origin.includes('jsdelivr.net') ||
        url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) ||
        event.request.destination === 'image') {

        event.respondWith(
            caches.open('retro-images-cache').then((cache) => {
                return cache.match(event.request).then((response) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return response || fetchPromise;
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
