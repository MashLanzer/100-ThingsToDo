"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AppHeader } from "@/components/shared/header"
import { BottomNav } from "@/components/shared/bottom-nav"
import { CoupleModal } from "@/components/shared/couple-modal"
import { PhoneModal } from "@/components/shared/phone-modal"
import { FavorsModal } from "@/components/features/favors-modal"
import { MapModal } from "@/components/features/map-modal"
import { SettingsModal } from "@/components/shared/settings-modal"
import { useAppStore } from "@/stores/app-store"

function SplashScreen() {
  const coupleName = useAppStore((s) => s.coupleName)
  return (
    <div className="splash-screen">
      <svg
        width="72" height="72" viewBox="0 0 24 24" fill="#8B5CF6"
        style={{ marginBottom: "1.25rem", filter: "drop-shadow(0 8px 24px rgba(139,92,246,0.4))" }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <h1 style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: "2rem", fontWeight: 700,
        background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>
        {coupleName || "ThingsToDo"}
      </h1>
      <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.875rem", color: "#9E8BAD", marginTop: "0.375rem" }}>
        Hecho con amor
      </p>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false
    return !sessionStorage.getItem("ttd_splash_v1")
  })

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (showSplash) {
      sessionStorage.setItem("ttd_splash_v1", "1")
      const t = setTimeout(() => setShowSplash(false), 1800)
      return () => clearTimeout(t)
    }
  }, [showSplash])

  if (loading) {
    return (
      <div className="loading-screen">
        <svg className="animate-heartbeat" width="48" height="48" viewBox="0 0 24 24" fill="#8B5CF6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {showSplash && <SplashScreen />}
      <AppHeader />
      <main>{children}</main>
      <BottomNav />
      <CoupleModal />
      <SettingsModal />
      <PhoneModal />
      <FavorsModal />
      <MapModal />
    </>
  )
}
