/**
 * HYDEV Project Manager - Service Worker
 * NOTE: classic (non-module) script on purpose — module service workers
 * aren't reliably supported across browsers, and a failed registration
 * blocks PWA installability entirely. Keep this in sync with STORAGE_KEY's
 * version suffix / CACHE_NAME in constants.js.
 */

const CACHE_NAME = 'hydev-pm-v6';

const PRECACHE_URLS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './constants.js',
    './manifest.json',
    './logo.png',
    './hydev-logo.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install: precache assets. Cache each URL individually so one missing
// file (e.g. an icon that hasn't been added yet) can't fail the whole
// precache step and silently disable offline support.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.all(
                PRECACHE_URLS.map((url) =>
                    cache.add(url).catch((err) => console.warn('Precache skipped:', url, err))
                )
            ))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: network-first for the app shell (so code changes are always picked
// up while the local server is running), falling back to cache only when
// offline. Cache-first was tried initially but meant the browser could keep
// silently serving old app.js/index.html indefinitely after an update.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('/api/')) return; // never cache API calls

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Handle SKIP_WAITING message from app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});