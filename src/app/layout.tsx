import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/shared/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "ThingsToDo - Kawaii Edition",
  description: "Crea y comparte listas de cosas que hacer con tu pareja",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ThingsToDo",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#8B5CF6",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Apply stored theme before hydration to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=JSON.parse(localStorage.getItem("ttd_theme_v1")||"{}");var t={purple:["#8B5CF6","#EDE9FE","#F3E8FF","#F5F3FF"],pink:["#EC4899","#FCE7F3","#FDE7F3","#FDF2F8"],blue:["#3B82F6","#DBEAFE","#EFF6FF","#EFF6FF"],green:["#10B981","#D1FAE5","#ECFDF5","#ECFDF5"],orange:["#F97316","#FFF7ED","#FEF3C7","#FFF7ED"],lavender:["#A78BFA","#F5F3FF","#EDE9FE","#F5F3FF"]};var c=t[s.themeId];if(c){var r=document.documentElement;r.style.setProperty("--primary",c[0]);r.style.setProperty("--primary-lighter",c[1]);r.style.setProperty("--border",c[2]);r.style.setProperty("--muted",c[3])}if(s.fontSize==="large")document.documentElement.style.fontSize="17px"}catch(e){}})()` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
