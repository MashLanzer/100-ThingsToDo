"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { useState, useEffect } from "react"

const THEMES: Record<string, { primary: string; lighter: string; border: string; muted: string }> = {
  purple:   { primary: "#8B5CF6", lighter: "#EDE9FE", border: "#F3E8FF", muted: "#F5F3FF" },
  pink:     { primary: "#EC4899", lighter: "#FCE7F3", border: "#FDE7F3", muted: "#FDF2F8" },
  blue:     { primary: "#3B82F6", lighter: "#DBEAFE", border: "#EFF6FF", muted: "#EFF6FF" },
  green:    { primary: "#10B981", lighter: "#D1FAE5", border: "#ECFDF5", muted: "#ECFDF5" },
  orange:   { primary: "#F97316", lighter: "#FFF7ED", border: "#FEF3C7", muted: "#FFF7ED" },
  lavender: { primary: "#A78BFA", lighter: "#F5F3FF", border: "#EDE9FE", muted: "#F5F3FF" },
}

function applyStoredTheme() {
  try {
    const raw = localStorage.getItem("ttd_theme_v1")
    if (!raw) return
    const { themeId, fontSize } = JSON.parse(raw)
    const t = THEMES[themeId]
    if (t) {
      const root = document.documentElement
      root.style.setProperty("--primary", t.primary)
      root.style.setProperty("--primary-lighter", t.lighter)
      root.style.setProperty("--border", t.border)
      root.style.setProperty("--muted", t.muted)
    }
    if (fontSize === "large") {
      document.documentElement.style.fontSize = "17px"
    }
  } catch { /* SSR or storage unavailable */ }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  useEffect(() => { applyStoredTheme() }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors
        position="bottom-center"
        offset="80px"
        toastOptions={{ style: { marginBottom: "env(safe-area-inset-bottom, 0px)" } }}
      />
    </QueryClientProvider>
  )
}

