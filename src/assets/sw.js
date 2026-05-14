const CACHE_NAME = 'cache_@cachename';

const CACHED_URLS = [
    '/',
    '/favicon.svg',
    '/index.html',
    '/script.js',
    '/style.css',
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        for (const url of CACHED_URLS) {
            try {
                await cache.add(url);
            } catch (e) { }
        }

        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();

        await Promise.all(
            cacheNames
                .filter(name => name !== CACHE_NAME)
                .map(name => caches.delete(name))
        );

        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const { request } = event;

    if (request.method !== 'GET') return;
    if (!request.url.startsWith(self.location.origin)) return;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

    event.respondWith(handleFetch(request));
    event.waitUntil(updateCache(request));
});

async function handleFetch(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) return cachedResponse;

    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        return new Response('Offline and resource not cached', {
            status: 503,
            statusText: 'Service Unavailable',
        });
    }
}

async function updateCache(request) {
    try {
        const response = await fetch(request);

        if (!response || !response.ok) return;

        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
    } catch (e) { }
}