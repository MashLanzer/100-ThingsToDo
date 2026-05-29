import webpush from "web-push"

let _configured = false

function ensureConfigured() {
  if (_configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@thingstodo.app"
  if (!publicKey || !privateKey) throw new Error("VAPID keys not configured")
  webpush.setVapidDetails(subject, publicKey, privateKey)
  _configured = true
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  ensureConfigured()
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth_key,
    },
  }
  await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
}
