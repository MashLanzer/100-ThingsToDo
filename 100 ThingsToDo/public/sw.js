// sw.js - Service Worker para ThingsToDo Kawaii

// ============================================
// CONFIGURACIÓN DEL CACHÉ
// ============================================

// 1. Nombre y Versión del Caché
// Es crucial cambiar este nombre (ej. a 'v1.1') cada vez que actualices
// tus archivos CSS, JS o HTML para que los usuarios reciban la nueva versión.
const CACHE_NAME = 'thingstodo-kawaii-v1.0';

// 2. Lista de Archivos a Cachear (El "esqueleto" de tu app)
// Estos son los archivos mínimos que la app necesita para arrancar sin conexión.
const URLS_TO_CACHE = [
  '/', // La página principal
  '/index.html',
  '/styles.css',
  '/app.js',
  '/scr/config/manifest.json',

  // Módulos JS importantes
  '/scr/modules/couple.js',
  '/scr/modules/stats.js',
  '/scr/modules/surpriseTasks.js',
  '/scr/modules/notifications.js',
  '/scr/modules/testQuestions.js',

  // Animaciones
  '/scr/animations/animations.css',
  '/scr/animations/animations.js',

  // Iconos principales de la PWA
  '/scr/images/icon-192x192.png',
  '/scr/images/icon-512x512.png'

  // NOTA: Los recursos externos (fuentes, CDN) se cachearán automáticamente cuando se soliciten
];

// ============================================
// CICLO DE VIDA DEL SERVICE WORKER
// ============================================

// 3. Evento 'install': Se ejecuta cuando el SW se instala.
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...' );
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierto. Cacheando archivos base...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] ¡Instalación completa!');
        // Forzamos al nuevo SW a activarse inmediatamente.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Error durante la instalación:', error);
      })
  );
});

// 4. Evento 'activate': Se ejecuta cuando el SW se activa.
// Es el momento perfecto para limpiar cachés viejos.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activado y listo para tomar el control.');
      // Toma el control de todas las páginas abiertas.
      return self.clients.claim();
    })
    .catch(error => {
      console.error('[Service Worker] Error durante la activación:', error);
    })
  );
});

// 5. Evento 'fetch': Se ejecuta con cada petición de red.
// Aquí es donde interceptamos y decidimos si servir desde el caché o la red.
self.addEventListener('fetch', event => {
  // Ignoramos las peticiones que no son GET (como las de Firebase para escribir datos).
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si encontramos el recurso en el caché, lo devolvemos. ¡Rápido!
        if (cachedResponse) {
          console.log('[Service Worker] Sirviendo desde caché:', event.request.url);
          return cachedResponse;
        }

        // Si no, lo buscamos en la red.
        console.log('[Service Worker] Buscando en red:', event.request.url);
        return fetch(event.request);
      })
      .catch(error => {
        console.error('[Service Worker] Error al procesar petición:', event.request.url, error);
        // Si hay error, podríamos devolver una página de fallback
        // return caches.match('/offline.html');
      })
  );
});
