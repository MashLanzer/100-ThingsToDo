"use client"

import { useEffect, useState } from "react"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

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
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Sync user to Supabase
      const idToken = await result.user.getIdToken()
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
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #FDFCFE 0%, #FCF7FF 50%, #FFF7FC 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: "-5%",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          background: "white",
          borderRadius: "24px",
          boxShadow: "0 16px 48px rgba(139,92,246,0.15)",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "380px",
          textAlign: "center",
          animation: "fadeIn 0.4s ease forwards",
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 24px rgba(139,92,246,0.3)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontSize: "1.875rem",
              fontWeight: 700,
              color: "#2D1B3E",
              marginBottom: "0.25rem",
            }}
          >
            ThingsToDo
          </h1>
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #EDE9FE, #FCE7F3)",
              borderRadius: "999px",
              padding: "0.2rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#7C3AED",
            }}
          >
            Kawaii Edition 💕
          </span>
        </div>

        {/* Description */}
        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "#2D1B3E",
              marginBottom: "0.5rem",
            }}
          >
            Tu espacio romántico ✨
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6B5B7E", lineHeight: 1.6 }}>
            Crea listas de cosas por hacer, comparte momentos especiales y vive aventuras únicas con tu pareja
          </p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={signing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            width: "100%",
            padding: "0.875rem 1.5rem",
            background: "white",
            border: "2px solid #E9D5FF",
            borderRadius: "999px",
            fontFamily: "inherit",
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "#2D1B3E",
            cursor: signing ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(139,92,246,0.1)",
            opacity: signing ? 0.7 : 1,
          }}
        >
          {signing ? (
            <span>Iniciando sesión...</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {/* Features */}
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { icon: "💕", title: "Planes en pareja", desc: "Organiza citas y actividades románticas" },
            { icon: "🗺️", title: "Mapa de Aventuras", desc: "Marca los lugares que han visitado y los sueñan visitar" },
            { icon: "💎", title: "Cápsulas del Tiempo", desc: "Guarda recuerdos para el futuro" },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem",
                background: "#FDFCFE",
                borderRadius: "12px",
                border: "1px solid #F3E8FF",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #EDE9FE, #FCE7F3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.125rem",
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2D1B3E" }}>{f.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#9E8BAD" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
