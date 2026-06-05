"use client"

import { useRouter } from "next/navigation"
import { JournalApp } from "@/components/features/journal-app"

export default function DiarioPage() {
  const router = useRouter()
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <JournalApp onBack={() => router.push("/dashboard")} />
    </div>
  )
}
