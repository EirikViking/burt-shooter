/**
 * Burt Shooter Service Worker
 * Version: v2026-01-16_15-58-51
 * Strategy: Network-First for HTML/JS, Cache-First for assets
 */

const CACHE_NAME = 'burt-shooter-v2026-01-16_15-58-51';
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.webmanifest'
];

// Install: Cache app shell
self.addEventListener('install', (event) => {
    // Force new worker to active immediately
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL).catch((err) => {
                console.warn('[SW] App shell cache partial failure:', err);
                return Promise.resolve();
            });
        })
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
    // Skip cross-origin and non-GET
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip API calls
    if (event.request.url.includes('/api/')) {
        return;
    }

    const url = new URL(event.request.url);
    const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
    const isJS = url.pathname.endsWith('.js');

    // TASK 2: Network-First for HTML and JS (Critical for updates)
    if (isHTML || isJS) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache with new version
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-First for everything else (Assets, Images, Audio)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});
