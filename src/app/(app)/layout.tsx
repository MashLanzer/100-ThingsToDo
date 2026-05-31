"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AppHeader } from "@/components/shared/header"
import { BottomNav } from "@/components/shared/bottom-nav"
import { CoupleModal } from "@/components/shared/couple-modal"
import { PhoneModal } from "@/components/shared/phone-modal"
import { FavorsModal } from "@/components/features/favors-modal"
import { MapModal } from "@/components/features/map-modal"
import { SettingsModal } from "@/components/shared/settings-modal"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

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
