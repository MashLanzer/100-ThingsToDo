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

// 6. Evento 'message': Comunicación con la página principal
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

      default:
        console.warn('[Service Worker] Unknown message type:', event.data.type);
    }
  }
});

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
  // Funcionalidad de notificaciones removida
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
