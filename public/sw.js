const CACHE = 'fountain-of-cali-v2'
const CORE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(CORE)
    const page = await cache.match('/')
    const html = await page.text()
    const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+)"/g)].map(match => match[1])
    await Promise.allSettled([...new Set(assets)].map(asset => cache.add(asset)))
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith('fountain-of-cali-') && key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put('/', response.clone()))
      return response
    }).catch(async () => (await caches.match('/')) || Response.error()))
    return
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && url.pathname.startsWith('/_next/static/')) caches.open(CACHE).then(cache => cache.put(request, response.clone()))
    return response
  })))
})
