import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('push', (event) => {
  let data = {}

  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() ?? '' }
  }

  const title = data.title || 'PlayMe'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/playme-icon.svg',
      badge: data.badge || '/playme-icon.svg',
      tag: data.notificationId
        ? `playme-notification-${data.notificationId}`
        : undefined,
      data: {
        url: data.url || '/',
        notificationId: data.notificationId || null,
        type: data.type || null,
        targetUserId: data.targetUserId || null,
      },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    (async () => {
      const requestedUrl = new URL(
        event.notification.data?.url || '/',
        self.location.origin
      )
      const targetUrl =
        requestedUrl.origin === self.location.origin
          ? requestedUrl.href
          : self.location.origin
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const existingClient = windowClients.find(
        (client) => new URL(client.url).origin === self.location.origin
      )

      if (existingClient) {
        if ('navigate' in existingClient) {
          await existingClient.navigate(targetUrl)
        }
        return existingClient.focus()
      }

      return self.clients.openWindow(targetUrl)
    })()
  )
})
