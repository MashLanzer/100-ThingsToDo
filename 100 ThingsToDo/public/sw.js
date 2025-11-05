// sw.js - Versión Mejorada

const CACHE_NAME = 'lista-amor-v4'; // <-- Versión actualizada
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/scr/couple.js',
  '/scr/stats.js',
  //'/scr/notifications.js', // No olvides añadir los nuevos archivos JS
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&family=Fredoka:wght@300;400;500;600;700&display=swap'
];

// Evento de instalación: se abre el caché y se añaden los archivos base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME )
      .then(cache => {
        console.log('Cache abierto y archivos añadidos');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Evento activate: se activa el nuevo SW y se eliminan los cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Evento fetch: responde con los archivos del caché si están disponibles
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// ... (tus otros listeners como 'push') ...


/**
// Evento push: se activa cuando se recibe una notificación push
self.addEventListener('push', event => {
  const data = event.data.json(); // Asumimos que el servidor envía un JSON
  console.log('Notificación push recibida:', data);

  const title = data.title || 'Lista de Amor Kawaii';
  const options = {
    body: data.body,
    icon: '/images/icon-192x192.png', // Icono que se muestra en la notificación
    badge: '/images/icon-192x192.png' // Icono para la barra de estado en Android
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
*/