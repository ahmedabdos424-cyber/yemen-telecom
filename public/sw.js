const CACHE_NAME = 'yemen-telecom-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || fetched;
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => clients.claim())
  );
});

// ===== Push notifications (FCM data messages) =====
// The native app receives push natively via @capacitor-firebase/messaging;
// this handler covers web fallback and background data messages.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const notification = payload.notification || {
    title: payload.title || 'يمن تليكوم',
    body: payload.body || 'لديك إشعار جديد',
  };
  const options = {
    body: notification.body || notification.title,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    tag: payload.data?.alertId ? `alert-${payload.data.alertId}` : undefined,
    requireInteraction: false,
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(notification.title || 'يمن تليكوم', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
