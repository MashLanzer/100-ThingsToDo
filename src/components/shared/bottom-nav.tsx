"use client"

import { usePathname, useRouter } from "next/navigation"
import { ClipboardList, Images } from "lucide-react"

const TABS = [
  { id: "planes", label: "Planes", Icon: ClipboardList, href: "/dashboard", emoji: "📋" },
  { id: "fotos", label: "Fotos", Icon: Images, href: "/fotos", emoji: "📷" },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon, href }) => {
        const isActive = pathname.startsWith(href)
        return (
          <button
            key={id}
            className={`bottom-nav-item${isActive ? " active" : ""}`}
            onClick={() => router.push(href)}
          >
            <span className="nav-pill">
              <Icon size={24} strokeWidth={isActive ? 2.2 : 1.7} />
            </span>
            <span className="nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
