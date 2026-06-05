"use client"

import { usePathname, useRouter } from "next/navigation"
import { ClipboardList, Images, BookOpen } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { useEffect, useState } from "react"

const TABS = [
  { id: "planes", label: "Planes", Icon: ClipboardList, href: "/dashboard", storageKey: "ttd_last_visit_dashboard", emoji: "📋" },
  { id: "diario", label: "Diario", Icon: BookOpen,      href: "/diario",    storageKey: "ttd_last_visit_diario",    emoji: "📔" },
  { id: "fotos",  label: "Fotos",  Icon: Images,        href: "/fotos",     storageKey: "ttd_last_visit_fotos",     emoji: "📷" },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const partnerLastActive = useAppStore((s) => s.partnerLastActive)
  const [lastVisit, setLastVisit] = useState<Record<string, number>>({})

  // Load last-visit timestamps from sessionStorage on mount
  useEffect(() => {
    const visits: Record<string, number> = {}
    for (const tab of TABS) {
      const raw = sessionStorage.getItem(tab.storageKey)
      visits[tab.storageKey] = raw ? parseInt(raw, 10) : 0
    }
    setLastVisit(visits)
  }, [])

  // Update last-visit timestamp when the active tab changes
  useEffect(() => {
    for (const tab of TABS) {
      if (pathname.startsWith(tab.href)) {
        const now = Date.now()
        sessionStorage.setItem(tab.storageKey, now.toString())
        setLastVisit((prev) => ({ ...prev, [tab.storageKey]: now }))
      }
    }
  }, [pathname])

  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon, href, storageKey }) => {
        const isActive = pathname.startsWith(href)
        const hasNewActivity =
          partnerLastActive !== null &&
          partnerLastActive > (lastVisit[storageKey] ?? 0) &&
          !isActive
        return (
          <button
            key={id}
            className={`bottom-nav-item${isActive ? " active" : ""}`}
            onClick={() => router.push(href)}
          >
            <span className="nav-pill" style={{ position: "relative" }}>
              <Icon size={24} strokeWidth={isActive ? 2.2 : 1.7} />
              {hasNewActivity && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid white",
                  }}
                />
              )}
            </span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
