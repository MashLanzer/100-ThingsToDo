"use client"

import { useEffect, useState } from "react"
import {
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

async function isCapacitorNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core")
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

const FLOAT_HEARTS = [
  { emoji: "♥", size: 22, x: "12%", delay: "0s", dur: "7s", opacity: 0.18 },
  { emoji: "♡", size: 16, x: "28%", delay: "1.2s", dur: "9s", opacity: 0.14 },
  { emoji: "♥", size: 28, x: "72%", delay: "0.4s", dur: "8s", opacity: 0.12 },
  { emoji: "♡", size: 18, x: "85%", delay: "2.1s", dur: "10s", opacity: 0.16 },
  { emoji: "♥", size: 14, x: "50%", delay: "1.8s", dur: "6s", opacity: 0.10 },
  { emoji: "✦",  size: 12, x: "40%", delay: "3s",  dur: "11s", opacity: 0.13 },
]

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  async function handleGoogleLogin() {
    setSigning(true)
    try {
      const auth = getFirebaseAuth()
      let idToken: string

      if (await isCapacitorNative()) {
        const { FirebaseAuthentication } = await import(
          "@capacitor-firebase/authentication"
        )
        const result = await FirebaseAuthentication.signInWithGoogle()
        if (!result.credential?.idToken) throw new Error("No se obtuvo token de Google")
        const credential = GoogleAuthProvider.credential(result.credential.idToken)
        const firebaseResult = await signInWithCredential(auth, credential)
        idToken = await firebaseResult.user.getIdToken()

        await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: firebaseResult.user.displayName,
            email: firebaseResult.user.email,
            avatar_url: firebaseResult.user.photoURL,
          }),
        })
      } else {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        idToken = await result.user.getIdToken()

        await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: result.user.displayName,
            email: result.user.email,
            avatar_url: result.user.photoURL,
          }),
        })
      }

      router.replace("/dashboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión"
      toast.error(message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <svg className="animate-heartbeat" width="48" height="48" viewBox="0 0 24 24" fill="#8B5CF6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "linear-gradient(160deg, #f5f0ff 0%, #fce7f3 45%, #fff7ed 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes floatHeart {
          0%   { transform: translateY(100vh) rotate(-10deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-10vh) rotate(10deg); opacity: 0; }
        }
        @keyframes loginCardIn {
          0%   { opacity: 0; transform: translateY(28px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5), 0 8px 32px rgba(139,92,246,0.3); }
          50%       { box-shadow: 0 0 0 12px rgba(139,92,246,0), 0 8px 32px rgba(139,92,246,0.3); }
        }
      `}</style>

      {/* Floating hearts */}
      {FLOAT_HEARTS.map((h, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: "-10vh",
            left: h.x,
            fontSize: h.size,
            color: i % 2 === 0 ? "#8B5CF6" : "#EC4899",
            opacity: h.opacity,
            animation: `floatHeart ${h.dur} ${h.delay} linear infinite`,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        >
          {h.emoji}
        </span>
      ))}

      {/* Big decorative blobs */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", top: "-8%", right: "-8%",
          width: "380px", height: "380px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute", bottom: "0", left: "-8%",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "28px",
          boxShadow: "0 20px 60px rgba(139,92,246,0.18), 0 4px 16px rgba(0,0,0,0.06)",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "380px",
          textAlign: "center",
          animation: "loginCardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) both",
          position: "relative",
          zIndex: 1,
          border: "1px solid rgba(255,255,255,0.8)",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "1.625rem" }}>
          {/* Outer glow ring */}
          <div style={{
            width: "88px", height: "88px", borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 0.25rem",
          }}>
            <div
              style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "logoPulse 2.8s ease-in-out infinite",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>

          <h1
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#2D1B3E",
              letterSpacing: "-0.01em",
              marginBottom: "0.25rem",
              marginTop: "0.75rem",
            }}
          >
            ThingsToDo
          </h1>
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #EDE9FE, #FCE7F3)",
              borderRadius: "999px",
              padding: "0.25rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#7C3AED",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            Kawaii Edition
          </span>
        </div>

        {/* Tagline */}
        <div style={{ marginBottom: "1.875rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#4A3560",
              marginBottom: "0.5rem",
              lineHeight: 1.4,
            }}
          >
            Vuestra app de pareja
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "#9E8BAD", lineHeight: 1.65 }}>
            Planes, aventuras, recuerdos y mucho más —<br />todo en un solo lugar.
          </p>
        </div>

        {/* Google Sign-in */}
        <button
          onClick={handleGoogleLogin}
          disabled={signing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            width: "100%",
            padding: "0.9375rem 1.5rem",
            background: signing ? "#f0ebfa" : "white",
            border: "2px solid #E9D5FF",
            borderRadius: "999px",
            fontFamily: "inherit",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#2D1B3E",
            cursor: signing ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 14px rgba(139,92,246,0.15)",
            opacity: signing ? 0.75 : 1,
          }}
          onMouseEnter={(e) => {
            if (!signing) {
              ;(e.currentTarget as HTMLButtonElement).style.background = "#F5F0FF"
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#C4B5FD"
              ;(e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(139,92,246,0.25)"
            }
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "white"
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#E9D5FF"
            ;(e.currentTarget as HTMLButtonElement).style.transform = "none"
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(139,92,246,0.15)"
          }}
        >
          {signing ? (
            <>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: "2px solid #C4B5FD", borderTopColor: "#7C3AED",
                animation: "spin 0.7s linear infinite", flexShrink: 0,
              }} />
              <span>Iniciando sesión...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="22" height="22" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {/* Feature pills */}
        <div style={{ marginTop: "1.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
          {[
            { icon: "💕", label: "Planes" },
            { icon: "🗺️", label: "Aventuras" },
            { icon: "📸", label: "Fotos" },
            { icon: "💎", label: "Cápsulas" },
            { icon: "📖", label: "Diario" },
            { icon: "🏦", label: "Metas" },
          ].map((f) => (
            <span
              key={f.label}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.25rem",
                background: "linear-gradient(135deg, #F5F0FF, #FDF2F8)",
                borderRadius: "999px",
                padding: "0.25rem 0.625rem",
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "#7C3AED",
                border: "1px solid rgba(139,92,246,0.12)",
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </span>
          ))}
        </div>

        <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "1.25rem", opacity: 0.7 }}>
          Al continuar aceptas guardar tus datos de pareja en nuestros servidores
        </p>
      </div>
    </div>
  )
}
