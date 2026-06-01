/**
 * Firebase client SDK — Auth only.
 * All data storage uses Supabase PostgreSQL.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
}

let _app: FirebaseApp | undefined
let _auth: Auth | undefined

function ensureApp(): FirebaseApp {
  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig)
  }
  return _app
}

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(ensureApp())
  return _auth
}

// Returns a valid Firebase ID token, waiting for auth state to be restored.
// Using auth.authStateReady() prevents the race condition where currentUser
// is null on page load before Firebase has finished restoring the session.
export async function getFirebaseToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  await auth.authStateReady()
  return (await auth.currentUser?.getIdToken()) ?? null
}
