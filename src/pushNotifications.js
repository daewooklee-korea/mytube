import { supabase } from './supabase'

export const VAPID_PUBLIC_KEY =
  'BP4v3zMGjA0-wUxWN_N60sGTWr7K2r0JmPDWzM9lAlGQCr5kpQYe2wiZj4sPWzT-LROUT5xWCPJulFDoxopno-4'

export const isPushSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const decoded = window.atob(base64)

  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

const serializeSubscription = (subscription) => {
  const data = subscription.toJSON()

  if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) {
    throw new Error('브라우저의 Push 구독 정보를 읽을 수 없습니다.')
  }

  return {
    endpoint: data.endpoint,
    p256dh: data.keys.p256dh,
    auth: data.keys.auth,
  }
}

export const getCurrentPushSubscription = async () => {
  if (!isPushSupported()) return null

  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export const enableAdminPush = async (userId) => {
  if (!isPushSupported()) {
    throw new Error('이 브라우저는 Web Push를 지원하지 않습니다.')
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? '브라우저에서 알림 권한이 차단되어 있습니다.'
        : '알림 권한이 허용되지 않았습니다.'
    )
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const serialized = serializeSubscription(subscription)
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      ...serialized,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) throw error

  return subscription
}

export const disableAdminPush = async (userId) => {
  const subscription = await getCurrentPushSubscription()

  if (!subscription) return

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint)

  if (error) throw error

  const unsubscribed = await subscription.unsubscribe()

  if (!unsubscribed) {
    throw new Error('브라우저 Push 구독을 해제하지 못했습니다.')
  }
}
