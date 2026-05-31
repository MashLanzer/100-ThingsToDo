"use client"

import { usePathname, useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { ClipboardList, Images, Smartphone, Settings2 } from "lucide-react"
import { useEffect, useState } from "react"

const TABS = [
  { id: "planes", label: "Planes", Icon: ClipboardList, href: "/dashboard" },
  { id: "fotos", label: "Fotos", Icon: Images, href: "/fotos" },
  { id: "apps", label: "Apps", Icon: Smartphone },
  { id: "ajustes", label: "Ajustes", Icon: Settings2 },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { openPhoneModal, openSettingsModal } = useAppStore()
  const [partnerActive, setPartnerActive] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const token = await getFirebaseAuth().currentUser?.getIdToken()
        if (!token) return
        const res = await fetch("/api/activity/partner", { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const { lastActive } = await res.json()
        if (lastActive) setPartnerActive((Date.now() - new Date(lastActive).getTime()) / 3_600_000 < 24)
      } catch { /* ignore */ }
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon, ...rest }) => {
        const href = "href" in rest ? rest.href : undefined
        const isActive = href ? pathname.startsWith(href) : false
        return (
          <button
            key={id}
            className={`bottom-nav-item${isActive ? " active" : ""}`}
            onClick={() => {
              if (href) router.push(href)
              else if (id === "apps") openPhoneModal("home")
              else if (id === "ajustes") openSettingsModal()
            }}
          >
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={22} />
              {id === "apps" && partnerActive && (
                <span style={{
                  position: "absolute",
                  top: -2, right: -2,
                  width: 7, height: 7,
                  borderRadius: "50%",
                  background: "#10B981",
                  border: "1.5px solid white",
                }} />
              )}
            </span>
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
