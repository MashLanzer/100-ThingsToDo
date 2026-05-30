"use client"

import { signOut } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useAppStore } from "@/stores/app-store"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useEffect } from "react"

function LogoutDialog({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(45,27,62,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(139,92,246,0.25)",
          padding: "2rem 1.75rem", width: "100%", maxWidth: "320px", textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>💔</div>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "#2D1B3E", marginBottom: "0.5rem" }}>
          ¿Nos vamos?
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6B5B7E", lineHeight: 1.5, marginBottom: "1.5rem" }}>
          ¿Seguro que quieres cerrar sesión? Te echaremos de menos 💜
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: "999px",
              border: "2px solid #E9D5FF", background: "white",
              fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 600,
              color: "#7C3AED", cursor: "pointer",
            }}
          >
            Quedarme 💕
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 600,
              color: "white", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : "Salir"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppHeader() {
  const router = useRouter()
  const { openPhoneModal, openSettingsModal, coupleName, setCoupleName } = useAppStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [partnerActive, setPartnerActive] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ttd_settings_v1")
      if (raw) {
        const s = JSON.parse(raw)
        if (s.coupleName && s.coupleName.trim()) setCoupleName(s.coupleName.trim())
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    async function checkPartnerActivity() {
      try {
        const auth = getFirebaseAuth()
        const token = await auth.currentUser?.getIdToken()
        if (!token) return
        const res = await fetch("/api/activity/partner", { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const { lastActive } = await res.json()
        if (lastActive) {
          const diffHours = (Date.now() - new Date(lastActive).getTime()) / 3_600_000
          setPartnerActive(diffHours < 24)
        }
      } catch { /* ignore */ }
    }
    checkPartnerActivity()
    const interval = setInterval(checkPartnerActivity, 60_000)
    return () => clearInterval(interval)
  }, [])

  async function confirmLogout() {
    setLoggingOut(true)
    try {
      await signOut(getFirebaseAuth())
      router.replace("/login")
    } catch {
      toast.error("Error al cerrar sesión")
      setLoggingOut(false)
      setShowLogoutDialog(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#8B5CF6">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="header-title header-title-gradient">{coupleName}</span>
          </div>
          <div className="header-right">
            {/* Settings */}
            <button className="btn-icon" title="Configuración" onClick={openSettingsModal}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {/* Phone apps */}
            <button className="btn-icon" title="Centro de Actividades" onClick={() => openPhoneModal("home")} style={{ position: "relative" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              {partnerActive && (
                <span style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#10B981", border: "2px solid white",
                  animation: "heartBeat 1.5s ease-in-out infinite",
                }} />
              )}
            </button>

            {/* Logout */}
            <button
              className="btn-icon"
              title="Cerrar Sesión"
              onClick={() => setShowLogoutDialog(true)}
              disabled={loggingOut}
              style={{ opacity: loggingOut ? 0.5 : 1 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showLogoutDialog && (
        <LogoutDialog
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutDialog(false)}
          loading={loggingOut}
        />
      )}
    </>
  )
}
