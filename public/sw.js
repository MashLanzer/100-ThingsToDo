// ThingsToDo Kawaii — Service Worker

// Activate new SW immediately and take control of open tabs so users always
// run the latest deployment (prevents stale-bundle "X is not a function" errors)
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle push events
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'ThingsToDo 💕', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
