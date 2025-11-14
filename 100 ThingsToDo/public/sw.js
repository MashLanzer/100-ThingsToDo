// sw.js - Service Worker para ThingsToDo Kawaii

// ============================================
// SISTEMA AVANZADO DE GESTIÓN DE CACHE MULTINIVEL
// ============================================

// 1. Configuración del Sistema de Cache Multinivel
const CACHE_CONFIG = {
  // Cache principal para recursos estáticos
  static: {
    name: 'thingstodo-static-v1.0',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    maxEntries: 100,
    strategy: 'cache-first'
  },

  // Cache para recursos dinámicos (API, Firebase)
  dynamic: {
    name: 'thingstodo-dynamic-v1.0',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    maxEntries: 50,
    strategy: 'network-first'
  },

  // Cache para imágenes y medios
  media: {
    name: 'thingstodo-media-v1.0',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    maxEntries: 30,
    strategy: 'cache-first'
  },

  // Cache para datos offline (IndexedDB backup)
  offline: {
    name: 'thingstodo-offline-v1.0',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
    maxEntries: 20,
    strategy: 'cache-only'
  },

  // Cache de memoria temporal (para sesiones activas)
  memory: {
    name: 'thingstodo-memory-v1.0',
    maxAge: 60 * 60 * 1000, // 1 hora
    maxEntries: 10,
    strategy: 'memory-first'
  }
};

// Cache en memoria (Map para acceso rápido)
const memoryCache = new Map();

// Estado del modo de bajo consumo
let lowPowerMode = false;

// 2. Recursos críticos que siempre deben estar disponibles offline
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles.css',
  '/app.js',
  '/scr/config/manifest.json',
  '/scr/images/icon-192x192.png',
  '/scr/images/icon-512x512.png'
];

// 3. Recursos que se cachean bajo demanda
const ON_DEMAND_RESOURCES = [
  '/scr/modules/couple.js',
  '/scr/modules/stats.js',
  '/scr/modules/surpriseTasks.js',
  '/scr/modules/notifications.js',
  '/scr/modules/testQuestions.js',
  '/scr/modules/randomTasks.js',
  '/scr/modules/questions.js',
  '/scr/animations/animations.css',
  '/scr/animations/animations.js'
];

// 4. URLs que nunca deben cachearse
const NO_CACHE_URLS = [
  /firebase\.googleapis\.com/,  // Firebase Auth/Realtime DB
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /googletagmanager\.com/,      // Analytics
  /google-analytics\.com/,
  /doubleclick\.net/,           // Ads
  /googlesyndication\.com/
];

// ============================================
// FUNCIONES DEL SISTEMA DE CACHE MULTINIVEL
// ============================================

// Función principal para determinar la estrategia de cache
async function getCacheStrategy(request) {
  const url = new URL(request.url);

  // Nunca cachear estas URLs
  if (NO_CACHE_URLS.some(pattern => pattern.test(url.href))) {
    return 'network-only';
  }

  // MODIFICACIÓN PARA MODO DE BAJO CONSUMO:
  // Cuando el modo de bajo consumo está activo, preferir cache sobre red
  if (lowPowerMode) {
    // Recursos críticos: Cache Only (no hacer peticiones de red)
    if (CRITICAL_RESOURCES.includes(url.pathname)) {
      return 'cache-only';
    }

    // Imágenes y medios: Cache Only
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
      return 'cache-only';
    }

    // Fuentes: Cache Only
    if (/\.(woff|woff2|ttf|eot)$/i.test(url.pathname)) {
      return 'cache-only';
    }

    // CSS y JS: Cache First (solo usar red si no está en cache)
    if (/\.(css|js)$/i.test(url.pathname)) {
      return 'cache-first';
    }

    // Páginas HTML: Cache First
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
      return 'cache-first';
    }

    // APIs y datos dinámicos: Cache Only (no hacer peticiones)
    if (url.pathname.includes('/api/') || url.href.includes('firestore')) {
      return 'cache-only';
    }

    // Todo lo demás: Cache First
    return 'cache-first';
  }

  // ESTRATEGIAS NORMALES (modo de bajo consumo inactivo)

  // Recursos críticos: Cache First
  if (CRITICAL_RESOURCES.includes(url.pathname)) {
    return 'cache-first';
  }

  // Imágenes y medios: Cache First con expiración
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    return 'cache-first';
  }

  // Fuentes: Cache First
  if (/\.(woff|woff2|ttf|eot)$/i.test(url.pathname)) {
    return 'cache-first';
  }

  // CSS y JS: Stale While Revalidate
  if (/\.(css|js)$/i.test(url.pathname)) {
    return 'stale-while-revalidate';
  }

  // Páginas HTML: Network First
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    return 'network-first';
  }

  // APIs y datos dinámicos: Network First
  if (url.pathname.includes('/api/') || url.href.includes('firestore')) {
    return 'network-first';
  }

  // Por defecto: Cache First
  return 'cache-first';
}

// Función para obtener respuesta desde el cache multinivel
async function getFromMultiLevelCache(request, cacheType = null) {
  const url = request.url;

  // 1. Intentar cache de memoria primero (siempre que sea posible)
  if (memoryCache.has(url)) {
    const cached = memoryCache.get(url);
    if (Date.now() - cached.timestamp < CACHE_CONFIG.memory.maxAge) {
      console.log('[Cache] Sirviendo desde memoria:', url);
      return cached.response.clone();
    } else {
      memoryCache.delete(url);
    }
  }

  // 2. Determinar tipo de cache si no se especificó
  if (!cacheType) {
    if (request.mode === 'navigate') {
      cacheType = 'static';
    } else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url)) {
      cacheType = 'media';
    } else if (url.includes('/api/') || url.includes('firestore')) {
      cacheType = 'dynamic';
    } else {
      cacheType = 'static';
    }
  }

  const cacheConfig = CACHE_CONFIG[cacheType];
  if (!cacheConfig) {
    console.warn('[Cache] Tipo de cache desconocido:', cacheType);
    return null;
  }

  try {
    const cache = await caches.open(cacheConfig.name);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Verificar si no ha expirado
      const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date') || 0);
      const age = Date.now() - cacheDate.getTime();

      if (age < cacheConfig.maxAge) {
        console.log(`[Cache] Sirviendo desde ${cacheType}:`, url);
        return cachedResponse;
      } else {
        // Cache expirado, eliminar
        await cache.delete(request);
        console.log('[Cache] Eliminando cache expirado:', url);
      }
    }
  } catch (error) {
    console.error('[Cache] Error accediendo al cache:', error);
  }

  return null;
}

// Función para almacenar en cache multinivel
async function putInMultiLevelCache(request, response, cacheType = null) {
  const url = request.url;

  // 1. Almacenar en memoria (para acceso rápido)
  if (response.status === 200 && !NO_CACHE_URLS.some(pattern => pattern.test(url))) {
    const responseClone = response.clone();
    memoryCache.set(url, {
      response: responseClone,
      timestamp: Date.now()
    });

    // Limitar tamaño del cache de memoria
    if (memoryCache.size > CACHE_CONFIG.memory.maxEntries) {
      const firstKey = memoryCache.keys().next().value;
      memoryCache.delete(firstKey);
    }
  }

  // 2. Determinar tipo de cache
  if (!cacheType) {
    if (request.mode === 'navigate') {
      cacheType = 'static';
    } else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url)) {
      cacheType = 'media';
    } else if (url.includes('/api/') || url.includes('firestore')) {
      cacheType = 'dynamic';
    } else {
      cacheType = 'static';
    }
  }

  const cacheConfig = CACHE_CONFIG[cacheType];
  if (!cacheConfig) return;

  try {
    const cache = await caches.open(cacheConfig.name);

    // Crear respuesta con headers de cache
    const responseClone = response.clone();
    const responseWithHeaders = new Response(responseClone.body, {
      status: responseClone.status,
      statusText: responseClone.statusText,
      headers: {
        ...Object.fromEntries(responseClone.headers.entries()),
        'sw-cache-date': new Date().toISOString(),
        'sw-cache-type': cacheType
      }
    });

    await cache.put(request, responseWithHeaders);
    console.log(`[Cache] Almacenado en ${cacheType}:`, url);

    // Mantener límite de entradas
    await enforceCacheLimits(cache, cacheConfig);

  } catch (error) {
    console.error('[Cache] Error almacenando en cache:', error);
  }
}

// Función para hacer cumplir límites de cache
async function enforceCacheLimits(cache, config) {
  try {
    const keys = await cache.keys();
    if (keys.length <= config.maxEntries) return;

    // Eliminar entradas más antiguas
    const entriesToDelete = keys.length - config.maxEntries;
    const sortedKeys = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        const cacheDate = new Date(response.headers.get('sw-cache-date') || 0);
        return { request, cacheDate };
      })
    );

    sortedKeys.sort((a, b) => a.cacheDate - b.cacheDate);

    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(sortedKeys[i].request);
      console.log('[Cache] Eliminando entrada antigua:', sortedKeys[i].request.url);
    }

  } catch (error) {
    console.error('[Cache] Error aplicando límites:', error);
  }
}

// Función para limpiar caches expirados
async function cleanupExpiredCaches() {
  console.log('[Cache] Iniciando limpieza de caches expirados...');

  for (const [cacheType, config] of Object.entries(CACHE_CONFIG)) {
    try {
      const cache = await caches.open(config.name);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;

        const cacheDate = new Date(response.headers.get('sw-cache-date') || 0);
        const age = Date.now() - cacheDate.getTime();

        if (age > config.maxAge) {
          await cache.delete(request);
          console.log('[Cache] Eliminado expirado:', request.url);
        }
      }
    } catch (error) {
      console.error(`[Cache] Error limpiando ${cacheType}:`, error);
    }
  }

  // Limpiar memoria cache
  for (const [url, data] of memoryCache.entries()) {
    if (Date.now() - data.timestamp > CACHE_CONFIG.memory.maxAge) {
      memoryCache.delete(url);
    }
  }

  console.log('[Cache] Limpieza completada');
}

// Función para pre-cachear recursos críticos
async function preCacheCriticalResources() {
  console.log('[Cache] Pre-cacheando recursos críticos...');

  const cache = await caches.open(CACHE_CONFIG.static.name);

  for (const url of CRITICAL_RESOURCES) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await putInMultiLevelCache(new Request(url), response, 'static');
        console.log('[Cache] Pre-cacheado crítico:', url);
      }
    } catch (error) {
      console.warn('[Cache] Error pre-cacheando crítico:', url, error);
    }
  }
}

// Función para cachear recursos bajo demanda
async function cacheOnDemandResources() {
  console.log('[Cache] Cacheando recursos bajo demanda...');

  const cache = await caches.open(CACHE_CONFIG.static.name);

  // Cachear en lotes para no sobrecargar
  const batchSize = 3;
  for (let i = 0; i < ON_DEMAND_RESOURCES.length; i += batchSize) {
    const batch = ON_DEMAND_RESOURCES.slice(i, i + batchSize);

    await Promise.all(batch.map(async (url) => {
      try {
        // Solo cachear si no está ya en cache
        const existing = await getFromMultiLevelCache(new Request(url));
        if (!existing) {
          const response = await fetch(url);
          if (response.ok) {
            await putInMultiLevelCache(new Request(url), response, 'static');
            console.log('[Cache] Cacheado bajo demanda:', url);
          }
        }
      } catch (error) {
        console.debug('[Cache] Error cacheando bajo demanda:', url);
      }
    }));

    // Pequeña pausa entre lotes
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Función para obtener estadísticas de cache
async function getCacheStatistics() {
  const stats = {
    memory: {
      entries: memoryCache.size,
      size: 'N/A' // Difícil calcular en JS
    }
  };

  for (const [cacheType, config] of Object.entries(CACHE_CONFIG)) {
    try {
      const cache = await caches.open(config.name);
      const keys = await cache.keys();
      stats[cacheType] = {
        entries: keys.length,
        config: config
      };
    } catch (error) {
      stats[cacheType] = { error: error.message };
    }
  }

  return stats;
}

// Función para comprimir respuesta (si es posible)
async function compressResponse(response) {
  // En un entorno real, implementarías compresión aquí
  // Por ahora, solo devolver la respuesta original
  return response;
}

// Función para obtener estadísticas de cache
async function getCacheStatistics() {
  const stats = {
    memory: {
      entries: memoryCache.size,
      size: 'N/A' // Difícil calcular en JS
    }
  };

  for (const [cacheType, config] of Object.entries(CACHE_CONFIG)) {
    try {
      const cache = await caches.open(config.name);
      const keys = await cache.keys();
      stats[cacheType] = {
        entries: keys.length,
        config: config
      };
    } catch (error) {
      stats[cacheType] = { error: error.message };
    }
  }

  return stats;
}

// Función para comprimir respuesta (si es posible)
async function compressResponse(response) {
  // En un entorno real, implementarías compresión aquí
  // Por ahora, solo devolver la respuesta original
  return response;
}

// Función para optimizar imagen (placeholder para futuras mejoras)
async function optimizeImage(response) {
  // En un entorno real, podrías redimensionar o convertir imágenes
  return response;
}

// Función para actualizar estadísticas de uso
function updateUsageStatistics(feature) {
  try {
    const stats = JSON.parse(localStorage.getItem('usageStats') || '{}');
    stats[feature] = (stats[feature] || 0) + 1;
    stats.lastUsed = Date.now();
    localStorage.setItem('usageStats', JSON.stringify(stats));

    // Notificar al SW para actualizar cache inteligente
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_USAGE_STATS',
        data: { feature, stats }
      });
    }
  } catch (error) {
    console.error('[PWA] Error actualizando estadísticas de uso:', error);
  }
}

// Escuchar actualizaciones de estadísticas desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_USAGE_STATS') {
    console.log('[Service Worker] Estadísticas de uso actualizadas:', event.data.data);
    // Re-evaluar qué recursos cachear
    setTimeout(() => {
      cacheOnDemandResources();
    }, 5000);
  }

  // Nuevo mensaje para obtener estadísticas de cache
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStatistics().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

// 3. Evento 'install': Se ejecuta cuando el SW se instala.
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...' );
  event.waitUntil(
    (async () => {
      try {
        // Pre-cachear recursos críticos
        await preCacheCriticalResources();

        // Cachear recursos bajo demanda en background
        setTimeout(() => {
          cacheOnDemandResources();
        }, 2000);

        console.log('[Service Worker] ¡Instalación completa!');
        // Forzamos al nuevo SW a activarse inmediatamente.
        return self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Error durante la instalación:', error);
        throw error;
      }
    })()
  );
});

// 4. Evento 'activate': Se ejecuta cuando el SW se activa.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    (async () => {
      try {
        // Limpiar caches antiguos
        const cacheNames = await caches.keys();
        const validCacheNames = Object.values(CACHE_CONFIG).map(config => config.name);

        await Promise.all(
          cacheNames.map(cacheName => {
            if (!validCacheNames.includes(cacheName)) {
              console.log('[Service Worker] Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );

        // Limpiar caches expirados
        await cleanupExpiredCaches();

        // Programar limpieza periódica
        setInterval(cleanupExpiredCaches, 24 * 60 * 60 * 1000); // Una vez al día

        console.log('[Service Worker] Activado y listo para tomar el control.');
        // Toma el control de todas las páginas abiertas.
        return self.clients.claim();
      } catch (error) {
        console.error('[Service Worker] Error durante la activación:', error);
        throw error;
      }
    })()
  );
});

// 5. Evento 'fetch': Se ejecuta con cada petición de red.
// Implementa estrategias de cache multinivel avanzadas
self.addEventListener('fetch', event => {
  // Manejar peticiones de Web Share Target
  if (event.request.url.includes('/index.html?action=share-received') && event.request.method === 'POST') {
    event.respondWith(handleShareTargetRequest(event.request));
    return;
  }

  // Ignoramos las peticiones que no son GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Obtener la estrategia de cache para esta petición
  event.respondWith(
    (async () => {
      const strategy = await getCacheStrategy(event.request);
      console.log(`[Cache] Usando estrategia '${strategy}' para:`, event.request.url);

      try {
        switch (strategy) {
          case 'network-only':
            // Solo red, nunca cache
            return await fetch(event.request);

          case 'cache-only':
            // Solo cache, nunca red
            const cachedOnly = await getFromMultiLevelCache(event.request);
            if (cachedOnly) {
              return cachedOnly;
            }
            throw new Error('Recurso no encontrado en cache');

          case 'cache-first':
            // Cache primero, luego red si falla
            const cachedFirst = await getFromMultiLevelCache(event.request);
            if (cachedFirst) {
              return cachedFirst;
            }

            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              await putInMultiLevelCache(event.request, networkResponse.clone());
            }
            return networkResponse;

          case 'network-first':
            // Red primero, luego cache como fallback
            try {
              const networkFirst = await fetch(event.request);
              if (networkFirst.ok) {
                await putInMultiLevelCache(event.request, networkFirst.clone());
                return networkFirst;
              }
            } catch (error) {
              console.log('[Cache] Red falló, intentando cache:', event.request.url);
            }

            const cachedFallback = await getFromMultiLevelCache(event.request);
            if (cachedFallback) {
              return cachedFallback;
            }

            // Si es navegación y no hay cache, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }

            throw new Error('Recurso no disponible');

          case 'stale-while-revalidate':
            // Servir cache mientras actualiza en background
            const staleResponse = await getFromMultiLevelCache(event.request);

            // Actualizar en background
            fetch(event.request).then(networkResponse => {
              if (networkResponse.ok) {
                putInMultiLevelCache(event.request, networkResponse);
              }
            }).catch(error => {
              console.debug('[Cache] Error actualizando en background:', error);
            });

            if (staleResponse) {
              return staleResponse;
            }

            // Si no hay cache, intentar red
            const freshResponse = await fetch(event.request);
            if (freshResponse.ok) {
              await putInMultiLevelCache(event.request, freshResponse.clone());
            }
            return freshResponse;

          default:
            // Estrategia por defecto: cache-first
            return await handleCacheFirst(event.request);
        }

      } catch (error) {
        console.error('[Cache] Error manejando petición:', event.request.url, error);

        // Fallback para navegación
        if (event.request.mode === 'navigate') {
          const cachedPage = await getFromMultiLevelCache(event.request, 'static');
          if (cachedPage) {
            return cachedPage;
          }
          return caches.match('/offline.html');
        }

        // Para otros recursos, intentar cache una vez más
        const fallbackCache = await getFromMultiLevelCache(event.request);
        if (fallbackCache) {
          return fallbackCache;
        }

        throw error;
      }
    })()
  );
});

// Función auxiliar para estrategia cache-first por defecto
async function handleCacheFirst(request) {
  const cached = await getFromMultiLevelCache(request);
  if (cached) {
    return cached;
  }

  const network = await fetch(request);
  if (network.ok) {
    await putInMultiLevelCache(request, network.clone());
  }
  return network;
}

// Función para manejar Web Share Target requests
async function handleShareTargetRequest(request) {
  try {
    console.log('[Share] Procesando petición de compartir');

    // Solo manejar POST requests para compartir
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parsear el FormData
    const formData = await request.formData();
    const sharedData = {
      title: formData.get('title') || '',
      text: formData.get('text') || '',
      url: formData.get('url') || '',
      files: [],
      timestamp: Date.now()
    };

    // Procesar archivos si los hay
    const files = formData.getAll('files');
    for (const file of files) {
      if (file instanceof File) {
        // Convertir archivo a base64 para almacenamiento
        const base64 = await fileToBase64(file);
        sharedData.files.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        });
      }
    }

    console.log('[Share] Datos compartidos procesados:', sharedData);

    // Almacenar en sessionStorage para que la app principal lo recoja
    // Nota: En service worker no tenemos acceso directo a sessionStorage,
    // así que enviamos un mensaje a la app principal
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'SHARED_CONTENT_RECEIVED',
        data: sharedData
      });
    }

    // Redirigir a la página principal con el parámetro de acción
    const redirectUrl = new URL('/', self.location.origin);
    redirectUrl.searchParams.set('action', 'share-received');

    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('[Share] Error procesando petición de compartir:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Función auxiliar para convertir File a base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 6. Evento 'push': Maneja las notificaciones push entrantes
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received');

  let data = {};

  if (event.data) {
    data = event.data.json();
  }

  const options = {
    ...PUSH_NOTIFICATION_CONFIG,
    body: data.body || '¡Tienes una nueva notificación!',
    icon: data.icon || PUSH_NOTIFICATION_CONFIG.icon,
    badge: data.badge || PUSH_NOTIFICATION_CONFIG.badge,
    image: data.image,
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : PUSH_NOTIFICATION_CONFIG.requireInteraction,
    silent: data.silent !== undefined ? data.silent : PUSH_NOTIFICATION_CONFIG.silent,
    vibrate: data.vibrate || PUSH_NOTIFICATION_CONFIG.vibrate,
    data: {
      url: data.url || '/',
      action: data.action,
      ...data.data
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '100 ThingsToDo 💕', options)
      .then(() => {
        console.log('[Service Worker] Push notification shown successfully');
      })
      .catch(error => {
        console.error('[Service Worker] Error showing push notification:', error);
      })
  );
});

// 7. Evento 'notificationclick': Maneja los clicks en las notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);

  event.notification.close();

  const notificationData = event.notification.data || {};
  let url = notificationData.url || '/';

  // Si hay una acción específica, agregarla a la URL
  if (notificationData.action) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}action=${notificationData.action}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Buscar si ya hay una ventana abierta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
      .catch(error => {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

// 8. Evento 'notificationclose': Maneja cuando se cierra una notificación
self.addEventListener('notificationclose', event => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);

  // Aquí podrías enviar analytics sobre el cierre de notificaciones
  // o manejar lógica específica según el tag de la notificación
});

// 9. Evento 'message': Comunicación con la página principal
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;

      case 'CLEAR_CACHE':
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName !== CACHE_NAME) {
                console.log('[Service Worker] Clearing old cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        }).then(() => {
          event.ports[0].postMessage({ success: true });
        }).catch(error => {
          event.ports[0].postMessage({ error: error.message });
        });
        break;

      case 'SET_LOW_POWER_MODE':
        lowPowerMode = event.data.active;
        console.log(`[Service Worker] Modo de bajo consumo ${lowPowerMode ? 'activado' : 'desactivado'}`);

        // Notificar a todos los clientes conectados
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'LOW_POWER_MODE_CHANGED',
              data: { active: lowPowerMode }
            });
          });
        });
        break;

      default:
        console.warn('[Service Worker] Unknown message type:', event.data.type);
    }
  }
});
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-plans') {
    event.waitUntil(syncPendingPlans());
  } else if (event.tag === 'background-sync-test') {
    event.waitUntil(syncPendingTestData());
  } else if (event.tag === 'background-sync-stats') {
    event.waitUntil(syncPendingStats());
  }
});

// Función para sincronizar planes pendientes
async function syncPendingPlans() {
  try {
    console.log('[Service Worker] Sincronizando planes pendientes...');

    // Obtener datos pendientes del IndexedDB o localStorage
    const pendingPlans = await getPendingData('pendingPlans');

    if (pendingPlans && pendingPlans.length > 0) {
      // Intentar enviar cada plan pendiente
      for (const plan of pendingPlans) {
        try {
          await sendPlanToServer(plan);
          await removePendingData('pendingPlans', plan.id);
          console.log('[Service Worker] Plan sincronizado:', plan.id);
        } catch (error) {
          console.error('[Service Worker] Error sincronizando plan:', plan.id, error);
        }
      }
    }

    // Notificar a la página principal que la sincronización se completó
    await notifyClients('sync-completed', { type: 'plans' });

  } catch (error) {
    console.error('[Service Worker] Error en background sync de planes:', error);
  }
}

// Función para sincronizar datos del test pendientes
async function syncPendingTestData() {
  try {
    console.log('[Service Worker] Sincronizando datos del test...');

    const pendingTestData = await getPendingData('pendingTestData');

    if (pendingTestData && pendingTestData.length > 0) {
      for (const testData of pendingTestData) {
        try {
          await sendTestDataToServer(testData);
          await removePendingData('pendingTestData', testData.id);
          console.log('[Service Worker] Datos del test sincronizados:', testData.id);
        } catch (error) {
          console.error('[Service Worker] Error sincronizando test data:', testData.id, error);
        }
      }
    }

    await notifyClients('sync-completed', { type: 'test' });

  } catch (error) {
    console.error('[Service Worker] Error en background sync del test:', error);
  }
}

// Función para sincronizar estadísticas pendientes
async function syncPendingStats() {
  try {
    console.log('[Service Worker] Sincronizando estadísticas...');

    const pendingStats = await getPendingData('pendingStats');

    if (pendingStats && pendingStats.length > 0) {
      for (const stats of pendingStats) {
        try {
          await sendStatsToServer(stats);
          await removePendingData('pendingStats', stats.id);
          console.log('[Service Worker] Estadísticas sincronizadas:', stats.id);
        } catch (error) {
          console.error('[Service Worker] Error sincronizando stats:', stats.id, error);
        }
      }
    }

    await notifyClients('sync-completed', { type: 'stats' });

  } catch (error) {
    console.error('[Service Worker] Error en background sync de stats:', error);
  }
}

// Funciones auxiliares para manejo de datos pendientes
async function getPendingData(key) {
  // En una implementación real, usarías IndexedDB
  // Por ahora, simulamos con localStorage
  const data = localStorage.getItem(`pending_${key}`);
  return data ? JSON.parse(data) : [];
}

async function removePendingData(type, id) {
  const data = await getPendingData(type);
  const filtered = data.filter(item => item.id !== id);
  localStorage.setItem(`pending_${type}`, JSON.stringify(filtered));
}

async function sendPlanToServer(plan) {
  // Simulación de envío a servidor
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simular éxito
      resolve({ success: true });
    }, 1000);
  });
}

async function sendTestDataToServer(testData) {
  // Simulación de envío a servidor
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 1000);
  });
}

async function sendStatsToServer(stats) {
  // Simulación de envío a servidor
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 1000);
  });
}

async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type, data });
  });
}

// 11. Evento 'periodicsync': Sincronización periódica en background
self.addEventListener('periodicsync', event => {
  console.log('[Service Worker] Periodic sync triggered:', event.tag);

  if (event.tag === 'update-content') {
    event.waitUntil(updateContentPeriodically());
  } else if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCache());
  } else if (event.tag === 'send-analytics') {
    event.waitUntil(sendAnalyticsData());
  }
});

// Función para actualizar contenido periódicamente
async function updateContentPeriodically() {
  try {
    console.log('[Service Worker] Actualizando contenido periódicamente...');

    // Verificar si hay actualizaciones en los datos de la app
    // Por ejemplo: nuevos planes, estadísticas actualizadas, etc.

    // Cachear recursos frescos
    const cache = await caches.open(CACHE_NAME);
    const resourcesToUpdate = [
      '/scr/modules/couple.js',
      '/scr/modules/stats.js',
      '/scr/modules/testQuestions.js'
    ];

    for (const resource of resourcesToUpdate) {
      try {
        const response = await fetch(resource);
        if (response.ok) {
          await cache.put(resource, response);
          console.log('[Service Worker] Recurso actualizado:', resource);
        }
      } catch (error) {
        console.warn('[Service Worker] Error actualizando recurso:', resource, error);
      }
    }

    // Notificar a los clientes que hay contenido fresco
    await notifyClients('content-updated', {
      timestamp: Date.now(),
      resources: resourcesToUpdate
    });

  } catch (error) {
    console.error('[Service Worker] Error en periodic sync de contenido:', error);
  }
}

// Función para limpiar caché antiguo periódicamente
async function cleanupOldCache() {
  try {
    console.log('[Service Worker] Limpiando caché antiguo...');

    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name =>
      name !== CACHE_NAME && name.startsWith('thingstodo-kawaii')
    );

    for (const cacheName of oldCaches) {
      await caches.delete(cacheName);
      console.log('[Service Worker] Caché antiguo eliminado:', cacheName);
    }

    // También limpiar datos antiguos de IndexedDB si los hubiera
    // await cleanupOldIndexedDBData();

  } catch (error) {
    console.error('[Service Worker] Error limpiando caché:', error);
  }
}

// Función para enviar datos de analytics
async function sendAnalyticsData() {
  try {
    console.log('[Service Worker] Enviando datos de analytics...');

    // Recopilar métricas de uso
    const analytics = {
      timestamp: Date.now(),
      swVersion: CACHE_NAME,
      cacheSize: await getCacheSize(),
      offlineUsage: await getOfflineUsageStats()
    };

    // Enviar a servidor de analytics
    // await fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(analytics)
    // });

    console.log('[Service Worker] Analytics enviados:', analytics);

  } catch (error) {
    console.error('[Service Worker] Error enviando analytics:', error);
  }
}

// Función auxiliar para obtener tamaño del caché
async function getCacheSize() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch (error) {
    return 0;
  }
}

// Función auxiliar para obtener estadísticas de uso offline
async function getOfflineUsageStats() {
  // Simular estadísticas de uso offline
  return {
    totalRequests: Math.floor(Math.random() * 100),
    cacheHits: Math.floor(Math.random() * 80),
    networkRequests: Math.floor(Math.random() * 20)
  };
}

// ============================================
// SISTEMA DE SERVICIOS EN BACKGROUND
// ============================================

// Background Sync para sincronización automática
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync activado:', event.tag);

  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(handleBackgroundSync());
      break;
    case 'location-sync':
      event.waitUntil(handleLocationSync());
      break;
    case 'reminder-sync':
      event.waitUntil(handleReminderSync());
      break;
    case 'backup-sync':
      event.waitUntil(handleBackupSync());
      break;
  }
});

// Periodic Background Sync para tareas recurrentes
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync activado:', event.tag);

  switch (event.tag) {
    case 'location-update':
      event.waitUntil(handlePeriodicLocationUpdate());
      break;
    case 'smart-reminders':
      event.waitUntil(handlePeriodicSmartReminders());
      break;
    case 'auto-backup':
      event.waitUntil(handlePeriodicAutoBackup());
      break;
    case 'maintenance':
      event.waitUntil(handlePeriodicMaintenance());
      break;
  }
});

// Manejar mensajes del cliente principal
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'LOCATION_STARTED':
      console.log('[Service Worker] Servicio de ubicación iniciado');
      // Registrar periodic sync para ubicación
      registerPeriodicSync('location-update', { minInterval: 30 * 60 * 1000 }); // 30 minutos
      break;

    case 'LOCATION_STOPPED':
      console.log('[Service Worker] Servicio de ubicación detenido');
      // Cancelar periodic sync para ubicación
      unregisterPeriodicSync('location-update');
      break;

    case 'LOCATION_UPDATE':
      handleLocationUpdate(data);
      break;

    case 'REGISTER_BACKGROUND_SYNC':
      registerBackgroundSync(data.tag, data.options);
      break;

    case 'NOTIFICATION_REQUEST':
      showBackgroundNotification(data);
      break;
  }
});

// ============================================
// FUNCIONES DE BACKGROUND SYNC
// ============================================

async function handleBackgroundSync() {
  try {
    console.log('[Service Worker] Ejecutando sincronización en background');

    // Sincronizar datos pendientes
    await syncPendingData();

    // Actualizar cache si es necesario
    await updateCacheIfNeeded();

    console.log('[Service Worker] Sincronización completada');
  } catch (error) {
    console.error('[Service Worker] Error en background sync:', error);
  }
}

async function handleLocationSync() {
  try {
    console.log('[Service Worker] Sincronizando datos de ubicación');

    // Aquí iría la lógica para sincronizar datos de ubicación
    // Por ejemplo, subir ubicaciones recientes a Firebase

  } catch (error) {
    console.error('[Service Worker] Error en location sync:', error);
  }
}

async function handleReminderSync() {
  try {
    console.log('[Service Worker] Sincronizando recordatorios inteligentes');

    // Aquí iría la lógica para sincronizar datos de recordatorios
    // y actualizar patrones de comportamiento

  } catch (error) {
    console.error('[Service Worker] Error en reminder sync:', error);
  }
}

async function handleBackupSync() {
  try {
    console.log('[Service Worker] Ejecutando backup automático');

    // Aquí iría la lógica para crear backups automáticos
    // y subirlos a la nube

  } catch (error) {
    console.error('[Service Worker] Error en backup sync:', error);
  }
}

// ============================================
// FUNCIONES DE PERIODIC SYNC
// ============================================

async function handlePeriodicLocationUpdate() {
  try {
    console.log('[Service Worker] Actualización periódica de ubicación');

    // Notificar al cliente que actualice la ubicación
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PERIODIC_LOCATION_UPDATE',
        timestamp: Date.now()
      });
    });

  } catch (error) {
    console.error('[Service Worker] Error en periodic location update:', error);
  }
}

async function handlePeriodicSmartReminders() {
  try {
    console.log('[Service Worker] Verificando recordatorios inteligentes');

    // Notificar al cliente para verificar recordatorios
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CHECK_SMART_REMINDERS',
        timestamp: Date.now()
      });
    });

  } catch (error) {
    console.error('[Service Worker] Error en periodic smart reminders:', error);
  }
}

async function handlePeriodicAutoBackup() {
  try {
    console.log('[Service Worker] Ejecutando backup periódico');

    // Notificar al cliente para crear backup
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PERIODIC_BACKUP',
        timestamp: Date.now()
      });
    });

  } catch (error) {
    console.error('[Service Worker] Error en periodic backup:', error);
  }
}

async function handlePeriodicMaintenance() {
  try {
    console.log('[Service Worker] Ejecutando mantenimiento periódico');

    // Limpiar caches antiguos
    await cleanupOldCaches();

    // Optimizar IndexedDB
    await optimizeIndexedDB();

    // Verificar integridad de datos
    await checkDataIntegrity();

  } catch (error) {
    console.error('[Service Worker] Error en periodic maintenance:', error);
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function syncPendingData() {
  // Sincronizar datos pendientes almacenados localmente
  try {
    // Obtener datos pendientes de IndexedDB
    const pendingData = await getPendingSyncData();

    if (pendingData.length > 0) {
      // Enviar a servidor
      for (const data of pendingData) {
        await sendToServer(data);
      }

      // Limpiar datos sincronizados
      await clearSyncedData(pendingData);
    }
  } catch (error) {
    console.error('[Service Worker] Error sincronizando datos pendientes:', error);
  }
}

async function updateCacheIfNeeded() {
  // Verificar si hay actualizaciones disponibles
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    // Verificar si el cache está desactualizado
    const lastUpdate = await getLastCacheUpdate();
    const now = Date.now();

    if (now - lastUpdate > 24 * 60 * 60 * 1000) { // 24 horas
      console.log('[Service Worker] Actualizando cache...');
      await updateStaticCache();
      await setLastCacheUpdate(now);
    }
  } catch (error) {
    console.error('[Service Worker] Error actualizando cache:', error);
  }
}

function handleLocationUpdate(data) {
  console.log('[Service Worker] Actualización de ubicación recibida:', data);

  // Aquí se podría almacenar la ubicación para análisis posterior
  // o enviar notificaciones basadas en ubicación
}

async function showBackgroundNotification(data) {
  try {
    await self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/scr/images/icon-192x192.png',
      badge: '/scr/images/icon-192x192.png',
      tag: data.tag || 'background-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    });
  } catch (error) {
    console.error('[Service Worker] Error mostrando notificación:', error);
  }
}

async function registerPeriodicSync(tag, options = {}) {
  try {
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register(tag, options);
      console.log(`[Service Worker] Periodic sync registrado: ${tag}`);
    } else {
      console.warn('[Service Worker] Periodic sync no soportado');
    }
  } catch (error) {
    console.error(`[Service Worker] Error registrando periodic sync ${tag}:`, error);
  }
}

async function unregisterPeriodicSync(tag) {
  try {
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.unregister(tag);
      console.log(`[Service Worker] Periodic sync cancelado: ${tag}`);
    }
  } catch (error) {
    console.error(`[Service Worker] Error cancelando periodic sync ${tag}:`, error);
  }
}

async function registerBackgroundSync(tag, options = {}) {
  try {
    await self.registration.sync.register(tag, options);
    console.log(`[Service Worker] Background sync registrado: ${tag}`);
  } catch (error) {
    console.error(`[Service Worker] Error registrando background sync ${tag}:`, error);
  }
}

// Funciones auxiliares para manejo de datos
async function getPendingSyncData() {
  // Implementar lógica para obtener datos pendientes
  return [];
}

async function sendToServer(data) {
  // Implementar lógica para enviar datos al servidor
}

async function clearSyncedData(data) {
  // Implementar lógica para limpiar datos sincronizados
}

async function getLastCacheUpdate() {
  // Implementar lógica para obtener última actualización del cache
  return Date.now() - 25 * 60 * 60 * 1000; // Simular que necesita actualización
}

async function setLastCacheUpdate(timestamp) {
  // Implementar lógica para guardar timestamp de actualización
}

async function updateStaticCache() {
  // Implementar lógica para actualizar cache estático
}

async function cleanupOldCaches() {
  // Implementar lógica para limpiar caches antiguos
}

async function optimizeIndexedDB() {
  // Implementar lógica para optimizar IndexedDB
}

async function checkDataIntegrity() {
  // Implementar lógica para verificar integridad de datos
}
