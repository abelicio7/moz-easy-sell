const CACHE_NAME = 'ensinapay-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Do not intercept external API requests (like Supabase database or functions)
  const url = new URL(event.request.url);
  if (url.origin.includes('supabase.co') || url.pathname.startsWith('/functions/')) {
    return;
  }

  // Network-first falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for local static assets
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

self.addEventListener('push', (event) => {
  let data = { 
    title: 'Venda Realizada! 🎉', 
    body: 'Parabéns, você realizou uma nova venda no EnsinaPay!',
    url: '/dashboard/sales'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png', // Monochromatic badge icon for Android
    vibrate: [200, 100, 200, 100, 400],   // Vibration pattern for coins
    sound: '/sale.mp3', // Note: Android Chrome often ignores this unless notification channels are set
    data: {
      url: data.url || '/dashboard/sales'
    },
    actions: [
      { action: 'open', title: 'Ver Detalhes' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // Also try to ask open windows to play the sound directly
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'PLAY_SALE_SOUND' }));
      });
    })
  );
});

// Action when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url || '/dashboard/sales';
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
