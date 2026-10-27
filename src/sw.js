import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
// Prefer the deployed document so menu settings do not remain on an old app version.
const navigationNetwork = new NetworkFirst({ cacheName: 'playme-pages', networkTimeoutSeconds: 3 })
const offlineDocument = createHandlerBoundToURL('index.html')
registerRoute(new NavigationRoute(async (options) => {
  try {
    return await navigationNetwork.handle(options) || await offlineDocument(options)
  } catch {
    return offlineDocument(options)
  }
}))

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
      icon: data.icon || '/playme-logo.svg',
      badge: data.badge || '/playme-notification.svg',
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
