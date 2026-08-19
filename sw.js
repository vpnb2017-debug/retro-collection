const CACHE_NAME = 'retro-collection-v134';
const ASSETS = [
    './',
    './index.html',
    './css/variables.css',
    './css/themes.css',
    './css/shelf.css',
    './js/app.js',
    './js/services/db.js',
    './js/services/platforms.js',
    './js/services/coverSearch.js',
    './js/services/webuyService.js',
    './js/services/localFileSync.js',
    './js/services/metadataService.js',
    './js/services/cloudSyncService.js',
    './js/services/theGamesDBService.js',
    './js/services/barcodeScannerService.js',
    './js/services/chartService.js',
    './js/services/exportService.js',
    './js/services/themeService.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Pre-caching v134');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME && k !== 'retro-images-cache').map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
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
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => response);
                    return response || fetchPromise;
                });
            })
        );
        return;
    }

    // Network-First for HTML, JS and CSS to guarantee fresh code
    if (event.request.mode === 'navigate' ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
