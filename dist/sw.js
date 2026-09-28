const CACHE = 'sfc-shell-v5';
const APP_SHELL = [
  '/',
  '/dist/index.html',
  '/dist/timeline.js',
  '/dist/persistence.js',
  '/dist/pwa.js',
  '/dist/notifications.js',
  '/dist/manifest.webmanifest',
  '/dist/icons/sfc-app-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && (url.pathname.startsWith('/dist/') || url.pathname === '/')) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(data.title || 'SFC update', {
    body: data.body || 'There is new activity in your shared case file.',
    icon: '/dist/icons/sfc-app-icon.svg',
    badge: '/dist/icons/sfc-app-icon.svg',
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || '/');
  }));
});
