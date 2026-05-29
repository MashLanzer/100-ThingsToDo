import { NextRequest } from "next/server"

type TokenUser = { uid: string; email: string | undefined; name: string | undefined; picture: string | undefined }

/**
 * Verifies Firebase ID token from Authorization header using the REST API.
 * No service account or firebase-admin needed — safe for Vercel Edge/Serverless.
 * Returns null on failure so routes can return 401 cleanly.
 */
export async function verifyFirebaseToken(req: NextRequest): Promise<TokenUser | null> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const idToken = authHeader.slice(7)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const user = data.users?.[0]
    if (!user) return null
    return {
      uid: user.localId,
      email: user.email,
      name: user.displayName,
      picture: user.photoUrl,
    }
  } catch {
    return null
  }
}
