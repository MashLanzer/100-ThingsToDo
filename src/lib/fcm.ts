/**
 * Server-only FCM (Firebase Cloud Messaging) sender for native Android push.
 *
 * IMPORTANT: This module imports `firebase-admin` and must NEVER be imported
 * from client/browser code — only from API routes / server code.
 *
 * Initializes firebase-admin lazily as a singleton from the FIREBASE_SERVICE_ACCOUNT
 * env var (a stringified service account JSON). Gracefully no-ops when the env var
 * is missing or invalid so the web/Vercel build never crashes before it is configured.
 */
import admin from "firebase-admin"

let app: admin.app.App | null = null

function getAdmin(): admin.app.App | null {
  if (app) return app
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    // Accept either raw JSON (starts with "{") or a base64-encoded JSON string.
    // Base64 is recommended for env vars to avoid newline/escaping issues in the
    // service account's private_key when pasted into hosting dashboards.
    const trimmed = raw.trim()
    const json = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8")
    const creds = JSON.parse(json)
    app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(creds) })
    return app
  } catch {
    return null
  }
}

export async function sendFcmToTokens(
  tokens: string[],
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; invalidTokens: string[] }> {
  const invalidTokens: string[] = []
  if (!tokens.length) return { sent: 0, invalidTokens }

  const adminApp = getAdmin()
  if (!adminApp) return { sent: 0, invalidTokens }

  const url = payload.url ?? "/"

  try {
    const messaging = adminApp.messaging()
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: { url },
      android: {
        priority: "high",
        notification: {
          icon: "ic_stat_icon",
          defaultSound: true,
        },
      },
    })

    res.responses.forEach((r, i) => {
      if (r.success) return
      const code = r.error?.code
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-argument" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(tokens[i])
      }
    })

    return { sent: res.successCount, invalidTokens }
  } catch {
    return { sent: 0, invalidTokens }
  }
}
