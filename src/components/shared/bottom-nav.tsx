"use client"

import { usePathname, useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { ClipboardList, Images } from "lucide-react"

const TABS = [
  { id: "planes", label: "Planes", Icon: ClipboardList, href: "/dashboard" },
  { id: "fotos", label: "Fotos", Icon: Images, href: "/fotos" },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { } = useAppStore()

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
            <span style={{ display: "inline-flex" }}>
              <Icon size={22} />
            </span>
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
