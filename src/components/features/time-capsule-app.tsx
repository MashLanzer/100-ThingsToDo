"use client"

import { useState, useEffect, useRef } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { TimeCapsule, CapsuleType } from "@/types"
import { formatDate } from "@/lib/utils"
import { PhoneLoader } from "@/components/features/phone-loader"
import { Trash2, Heart, Star, Trophy, HelpCircle, MessageSquare, Upload, Pencil } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import type { LucideProps } from "lucide-react"

const CAPSULE_TYPES: { id: CapsuleType; Icon: React.FC<LucideProps>; label: string; desc: string; color: string; glow: string }[] = [
  { id: "memory",      Icon: Heart,         label: "Recuerdo",  desc: "Momentos especiales",    color: "#60a5fa", glow: "#3b82f644" },
  { id: "dream",       Icon: Star,          label: "Sueño",     desc: "Metas y aspiraciones",   color: "#a78bfa", glow: "#8b5cf644" },
  { id: "love",        Icon: Heart,         label: "Amor",      desc: "Mensajes de corazón",    color: "#f472b6", glow: "#ec489944" },
  { id: "achievement", Icon: Trophy,        label: "Logro",     desc: "Éxitos personales",      color: "#fbbf24", glow: "#f59e0b44" },
  { id: "mystery",     Icon: HelpCircle,    label: "Misterio",  desc: "Sorpresas ocultas",      color: "#c084fc", glow: "#a855f744" },
  { id: "reflection",  Icon: MessageSquare, label: "Reflexión", desc: "Pensamientos profundos", color: "#34d399", glow: "#10b98144" },
]

const TYPE_BG: Record<string, string> = {
  memory:      "linear-gradient(160deg,#0c1a2e,#0f2d4a,#1a3a5c)",
  dream:       "linear-gradient(160deg,#130b2e,#1e1040,#2d1b56)",
  love:        "linear-gradient(160deg,#2e0b1a,#451228,#5c1a38)",
  achievement: "linear-gradient(160deg,#1c1400,#2e2000,#3d2d00)",
  mystery:     "linear-gradient(160deg,#180b2e,#26114a,#341760)",
  reflection:  "linear-gradient(160deg,#0b1e14,#0f2e1e,#143d28)",
}

const DATE_PRESETS = [
  { days: 30,  label: "1 Mes",    emoji: "🗓️" },
  { days: 90,  label: "3 Meses",  emoji: "📅" },
  { days: 180, label: "6 Meses",  emoji: "🏖️" },
  { days: 365, label: "1 Año",    emoji: "🎂" },
]

type CapsuleFilter = "all" | "waiting" | "ready" | "opened"
interface Props { onBack: () => void }
type View = "list" | "create" | "read"

const CONFETTI = ["💜", "✨", "💕", "⭐", "🌟"]

const APP_CSS = `
@keyframes capsuleCardIn {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes urgentBlink {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.45; }
}
@keyframes letterReveal {
  from { opacity: 0; transform: translateY(-14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes countFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes capGlowPulse {
  0%,100% { box-shadow: 0 0 10px rgba(167,139,250,0.35); }
  50%      { box-shadow: 0 0 28px rgba(167,139,250,0.75); }
}
@keyframes capBounce {
  0%,100% { transform: translateY(0); }
  40%     { transform: translateY(-10px); }
  60%     { transform: translateY(-5px); }
}
@keyframes capsuleFloatUp {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-120px) scale(1.4); }
}
@keyframes capsulePop {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes capsulePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
`

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return "hoy"
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`
  const years = Math.floor(months / 12)
  return `hace ${years} año${years > 1 ? "s" : ""}`
}

export function TimeCapsuleApp({ onBack }: Props) {
  const [view, setView] = useState<View>("list")
  const [capsules, setCapsules] = useState<TimeCapsule[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TimeCapsule | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<CapsuleFilter>("all")

  const [message, setMessage] = useState("")
  const [capsuleType, setCapsuleType] = useState<CapsuleType>("memory")
  const [unlockDays, setUnlockDays] = useState(30)
  const [customDate, setCustomDate] = useState("")
  const [customTime, setCustomTime] = useState("")
  const [useCustom, setUseCustom] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMessage, setEditMessage] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")

  const [openingCapsule, setOpeningCapsule] = useState<TimeCapsule | null>(null)
  const [countdownStep, setCountdownStep] = useState<number>(0)
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [capsulePhoto, setCapsulePhoto] = useState<string | null>(null)
  const [editCapsulePhoto, setEditCapsulePhoto] = useState<string | null>(null)
  const [showCapsuleGallery, setShowCapsuleGallery] = useState(false)
  const [showEditCapsuleGallery, setShowEditCapsuleGallery] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; image_url: string; thumb_url: string | null }[]>([])
  const [loadingGallery, setLoadingGallery] = useState(false)

  useEffect(() => { loadCapsules() }, [])

  async function authFetch(path: string, init?: RequestInit) {
    const token = await getFirebaseToken()
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error("Request failed")
    return res.json()
  }

  async function loadCapsules() {
    try {
      const data = await authFetch("/api/capsules")
      setCapsules(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function loadGallery() {
    if (galleryPhotos.length > 0) return
    setLoadingGallery(true)
    try {
      const token = await getFirebaseToken()
      if (!token) return
      const res = await fetch("/api/photos", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setGalleryPhotos(Array.isArray(data) ? data : [])
    } catch { /* silently fail */ } finally { setLoadingGallery(false) }
  }

  async function handleSave() {
    if (!message.trim()) { toast.error("Escribe un mensaje"); return }
    const unlock_date = useCustom && customDate
      ? customDate
      : new Date(Date.now() + unlockDays * 86_400_000).toISOString().split("T")[0]
    let unlock_at: string | undefined
    if (useCustom && customDate && customTime) {
      unlock_at = new Date(`${customDate}T${customTime}:00`).toISOString()
    }
    setSaving(true)
    try {
      await authFetch("/api/capsules", {
        method: "POST",
        body: JSON.stringify({
          message: message.trim(),
          type: capsuleType,
          unlock_date,
          unlock_at,
          ...(capsulePhoto ? { photo_url: capsulePhoto } : {}),
        }),
      })
      toast.success("¡Cápsula sellada! 💎")
      setMessage("")
      setCapsulePhoto(null)
      setView("list")
      loadCapsules()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  function startOpeningAnimation(capsule: TimeCapsule) {
    setOpeningCapsule(capsule)
    setCountdownStep(1)
    let step = 1
    function next() {
      step++
      setCountdownStep(step)
      if (step < 5) {
        countdownRef.current = setTimeout(next, 800)
      } else {
        countdownRef.current = setTimeout(() => doOpenCapsule(capsule), 600)
      }
    }
    countdownRef.current = setTimeout(next, 800)
  }

  async function doOpenCapsule(capsule: TimeCapsule) {
    try {
      await authFetch(`/api/capsules/${capsule.id}/open`, { method: "PATCH" })
      await loadCapsules()
      const updated = { ...capsule, is_opened: true }
      setSelected(updated)
      setOpeningCapsule(null)
      setCountdownStep(0)
      setView("read")
      toast.success("¡Cápsula abierta! ✨")
    } catch (e: unknown) {
      setOpeningCapsule(null)
      setCountdownStep(0)
      const msg = e instanceof Error ? e.message : ""
      if (msg.includes("not_ready")) toast.error("🔒 Esta cápsula aún no está lista para abrir")
      else toast.error("Error al abrir")
    }
  }

  async function handleOpen(capsule: TimeCapsule) {
    if (capsule.is_opened) { setSelected(capsule); setView("read"); return }
    if (!canOpenCapsule(capsule)) {
      const label = capsule.unlock_at
        ? `Se abre el ${formatDateTime(capsule.unlock_at)}`
        : `Se abre el ${formatDate(capsule.unlock_date)}`
      toast.error(`🔒 Aún no puedes abrir esta cápsula. ${label}`)
      return
    }
    if (!await showConfirm({ title: "Abrir cápsula ⏳", message: "Una vez abierta no podrás volver a cerrarla.", danger: false, confirmLabel: "Abrir" })) return
    startOpeningAnimation(capsule)
  }

  async function handleEditSave(capsule: TimeCapsule) {
    if (!editMessage.trim()) return
    setSaving(true)
    const newDate = editDate || capsule.unlock_date
    let newUnlockAt: string | null = null
    if (editTime && editDate) newUnlockAt = new Date(`${editDate}T${editTime}:00`).toISOString()
    try {
      await authFetch(`/api/capsules/${capsule.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          message: editMessage.trim(),
          unlock_date: newDate,
          unlock_at: newUnlockAt,
          ...(editCapsulePhoto !== null ? { photo_url: editCapsulePhoto } : {}),
        }),
      })
      toast.success("Cápsula actualizada ✨")
      setEditingId(null)
      setEditCapsulePhoto(null)
      loadCapsules()
    } catch { toast.error("Error al actualizar") } finally { setSaving(false) }
  }

  async function handleDelete(capsule: TimeCapsule) {
    if (!await showConfirm({ title: "Eliminar cápsula", danger: true })) return
    try {
      await authFetch(`/api/capsules/${capsule.id}`, { method: "DELETE" })
      toast.success("Cápsula eliminada")
      loadCapsules()
    } catch { toast.error("Error al eliminar") }
  }

  const nowDate = new Date()
  const now = `${nowDate.getFullYear()}-${String(nowDate.getMonth()+1).padStart(2,"0")}-${String(nowDate.getDate()).padStart(2,"0")}`

  function canOpenCapsule(c: TimeCapsule): boolean {
    if (c.unlock_at) return new Date() >= new Date(c.unlock_at)
    return c.unlock_date <= now
  }

  function formatDateTime(isoStr: string): string {
    const d = new Date(isoStr)
    return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  function timeUntil(c: TimeCapsule): string {
    const target = c.unlock_at ? new Date(c.unlock_at) : new Date(c.unlock_date + "T00:00:00")
    const diffMs = target.getTime() - nowDate.getTime()
    if (diffMs <= 0) return "¡Lista!"
    const days = Math.floor(diffMs / 86_400_000)
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000)
    const mins = Math.floor((diffMs % 3_600_000) / 60_000)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  function daysUntil(c: TimeCapsule): number {
    const target = c.unlock_at ? new Date(c.unlock_at) : new Date(c.unlock_date + "T00:00:00")
    return Math.max(0, Math.ceil((target.getTime() - nowDate.getTime()) / 86_400_000))
  }

  const filteredCapsules = capsules.filter((c) => {
    const ready = canOpenCapsule(c)
    if (filter === "waiting") return !c.is_opened && !ready
    if (filter === "ready")   return !c.is_opened && ready
    if (filter === "opened")  return c.is_opened
    return true
  })

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
    borderRadius: 12, padding: "0.625rem 0.875rem", color: "#f1f5f9",
    fontSize: "0.875rem", fontFamily: "inherit", outline: "none",
  }

  // ── OPENING ANIMATION ─────────────────────────────────────────────────────
  if (openingCapsule && countdownStep > 0) {
    const t = CAPSULE_TYPES.find(ct => ct.id === openingCapsule.type)
    const COUNTDOWN_LABELS = ["", "3", "2", "1", "✨", ""]
    const label = COUNTDOWN_LABELS[countdownStep] ?? ""
    return (
      <>
        <style>{APP_CSS}</style>
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: TYPE_BG[openingCapsule.type] ?? "linear-gradient(135deg,#2d1b3e,#1a0f2e)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem",
        }}>
          {CONFETTI.map((emoji, i) => (
            <div key={i} style={{
              position: "absolute", left: `${15 + i * 17}%`, top: `${30 + (i % 3) * 15}%`,
              fontSize: "1.5rem",
              animation: countdownStep >= 4 ? `capsuleFloatUp ${0.8 + i * 0.15}s ease forwards ${i * 0.1}s` : "none",
              opacity: countdownStep >= 4 ? 1 : 0, pointerEvents: "none",
            }}>{emoji}</div>
          ))}
          <div style={{ animation: "capsulePulse 1.2s ease infinite" }}>
            {t ? <t.Icon size={72} color={t.color} /> : <span style={{ fontSize: "4rem" }}>💎</span>}
          </div>
          {label && (
            <div key={countdownStep} style={{
              fontFamily: "'Fredoka',sans-serif",
              fontSize: countdownStep <= 3 ? "5rem" : "3rem",
              fontWeight: 700, color: "white",
              animation: "capsulePop 0.4s ease",
              textShadow: `0 0 30px ${t?.color ?? "#a78bfa"}cc`,
            }}>{label}</div>
          )}
          <p style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.6)" }}>
            Abriendo cápsula...
          </p>
        </div>
      </>
    )
  }

  // ── READ VIEW ─────────────────────────────────────────────────────────────
  if (view === "read" && selected) {
    const t = CAPSULE_TYPES.find((ct) => ct.id === selected.type)
    const bg = TYPE_BG[selected.type] ?? "linear-gradient(160deg,#0d0d1f,#1a0f2e,#2d1b3e)"
    return (
      <div style={{ minHeight: "100%", background: bg, display: "flex", flexDirection: "column" }}>
        <style>{APP_CSS}</style>

        {/* Header */}
        <div style={{ padding: "1rem 1rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setView("list")}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >‹</button>
          </div>
          <div style={{ fontSize: "3rem", animation: "capBounce 2.5s ease infinite" }}>
            {t ? <t.Icon size={52} color={t.color} /> : "💎"}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#f1f5f9", margin: 0 }}>
              Cápsula de {t?.label}
            </p>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `${t?.color}22`, color: t?.color, border: `1px solid ${t?.color}44` }}>
              ✉️ Abierta
            </span>
          </div>
        </div>

        <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem", overflowY: "auto" }}>
          {/* Photo */}
          {selected.photo_url && (
            <img
              src={selected.photo_url} alt=""
              style={{ width: "100%", borderRadius: 16, objectFit: "cover", maxHeight: 200, filter: "sepia(0.3) saturate(0.85)", animation: "letterReveal 0.4s ease" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          )}

          {/* Message card */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: `1.5px solid ${t?.color ?? "#a78bfa"}33`, borderLeft: `3px solid ${t?.color ?? "#a78bfa"}`, borderRadius: 16, padding: "1.125rem", animation: "letterReveal 0.5s ease 0.1s both" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: t?.color ?? "#a78bfa", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              💌 Mensaje
            </p>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.8, color: "#e2e8f0", whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>
              {selected.message}
            </p>
          </div>

          {/* Metadata */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "0.75rem 1rem", animation: "letterReveal 0.5s ease 0.2s both" }}>
            <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: "0 0 4px" }}>
              📝 Creada el {formatDateLong(selected.created_at)} · {timeAgo(selected.created_at)}
            </p>
            <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: 0 }}>
              🔓 Abierta el {formatDateLong(selected.unlock_date)}
            </p>
          </div>

          {/* Share */}
          <button
            onClick={async () => {
              const text = `Cápsula de ${t?.label ?? "Tiempo"}\n\n${selected.message}\n\n— Abierta el ${formatDate(selected.unlock_date)}`
              if (navigator.share) {
                try { await navigator.share({ title: "Nuestra Cápsula del Tiempo", text }) } catch { /* cancelled */ }
              } else {
                try { await navigator.clipboard.writeText(text); toast.success("¡Copiado! 📋") } catch { toast.error("No se pudo copiar") }
              }
            }}
            style={{ padding: "0.75rem", border: "none", borderRadius: 14, cursor: "pointer", background: `linear-gradient(135deg,${t?.color ?? "#a78bfa"}88,${t?.color ?? "#a78bfa"}55)`, color: "#f1f5f9", fontWeight: 700, fontSize: "0.9375rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}
          >
            <Upload size={16} /> 📤 Compartir cápsula
          </button>
        </div>
      </div>
    )
  }

  // ── CREATE VIEW ───────────────────────────────────────────────────────────
  if (view === "create") {
    const selectedType = CAPSULE_TYPES.find(t => t.id === capsuleType)
    const charPct = message.length / 2000
    const charColor = charPct > 0.85 ? "#f87171" : charPct > 0.5 ? "#fbbf24" : "#34d399"

    const unlockDateISO = useCustom && customDate
      ? customDate
      : new Date(Date.now() + unlockDays * 86_400_000).toISOString().split("T")[0]

    return (
      <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#0d0d1f 0%,#1a0f2e 50%,#2d1b3e 100%)", display: "flex", flexDirection: "column" }}>
        <style>{APP_CSS}</style>

        {/* Header */}
        <div style={{ padding: "0.875rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setView("list")}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >‹</button>
          <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "#f1f5f9", margin: 0, flex: 1 }}>
            💌 Nueva Cápsula
          </p>
        </div>

        <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          {/* Message */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tu Mensaje</label>
            <textarea
              style={{ ...inputStyle, resize: "none", minHeight: 120, fontFamily: "Georgia, serif", fontSize: "0.9375rem", lineHeight: 1.7 }}
              rows={5}
              placeholder={"Querido yo del futuro...\n\nHoy es un día especial porque..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: charColor, alignSelf: "flex-end", transition: "color 0.3s" }}>
              {message.length}/2000
            </span>
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo de Cápsula</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              {CAPSULE_TYPES.map((t) => {
                const active = capsuleType === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setCapsuleType(t.id)}
                    style={{
                      padding: "0.625rem 0.25rem", borderRadius: 14, border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: active ? `${t.glow}` : "rgba(255,255,255,0.05)",
                      border: active ? `1.5px solid ${t.color}88` : "1.5px solid rgba(255,255,255,0.08)",
                      boxShadow: active ? `0 0 14px ${t.glow}` : "none",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all 0.2s",
                    } as React.CSSProperties}
                  >
                    <t.Icon size={22} color={active ? t.color : "#64748b"} />
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: active ? t.color : "#64748b" }}>{t.label}</span>
                    <span style={{ fontSize: "0.5rem", color: active ? `${t.color}aa` : "#475569", textAlign: "center", lineHeight: 1.2 }}>{t.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha de Apertura</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
              {DATE_PRESETS.map((p) => {
                const active = unlockDays === p.days && !useCustom
                return (
                  <button
                    key={p.days}
                    onClick={() => { setUnlockDays(p.days); setUseCustom(false) }}
                    style={{
                      padding: "0.625rem 0.5rem", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: active ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.05)",
                      border: active ? "1.5px solid #a78bfa66" : "1.5px solid rgba(255,255,255,0.08)",
                      color: active ? "#a78bfa" : "#64748b", fontWeight: 700, fontSize: "0.8125rem",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    } as React.CSSProperties}
                  >
                    {p.emoji} {p.label}
                  </button>
                )
              })}
              <button
                onClick={() => setUseCustom(true)}
                style={{
                  padding: "0.625rem 0.5rem", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: useCustom ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.05)",
                  border: useCustom ? "1.5px solid #a78bfa66" : "1.5px solid rgba(255,255,255,0.08)",
                  color: useCustom ? "#a78bfa" : "#64748b", fontWeight: 700, fontSize: "0.8125rem",
                } as React.CSSProperties}
              >
                🎯 Personalizada
              </button>
            </div>

            {useCustom && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginTop: 4 }}>
                <input type="date" style={inputStyle} value={customDate} min={now} onChange={(e) => setCustomDate(e.target.value)} />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="time" style={{ ...inputStyle, flex: 1 }} value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
                  <span style={{ fontSize: "0.6875rem", color: "#475569", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>hora exacta</span>
                </div>
              </div>
            )}

            {/* Calculated date display */}
            <p style={{ fontSize: "0.8125rem", color: "#a78bfa", fontFamily: "'Fredoka',sans-serif", fontWeight: 600, margin: "2px 0 0", fontStyle: "italic" }}>
              🔓 Se abrirá el {formatDateLong(unlockDateISO)}
            </p>
          </div>

          {/* Photo */}
          {showCapsuleGallery && (
            <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column" }} onClick={() => setShowCapsuleGallery(false)}>
              <div style={{ marginTop: "auto", background: "#1a1a2e", borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f1f5f9" }}>Elegir foto</span>
                  <button onClick={() => setShowCapsuleGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "#94a3b8", lineHeight: 1 }}>×</button>
                </div>
                {loadingGallery ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Cargando fotos...</div>
                ) : galleryPhotos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Sin fotos aún</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                    {galleryPhotos.map(p => (
                      <div key={p.id} onClick={() => { setCapsulePhoto(p.image_url); setShowCapsuleGallery(false) }}
                        style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", border: capsulePhoto === p.image_url ? "3px solid #a78bfa" : "2px solid transparent" }}>
                        <img src={p.thumb_url ?? p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>📷 Foto (opcional)</label>
            <button
              type="button"
              onClick={() => { setShowCapsuleGallery(true); loadGallery() }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", borderRadius: 999, border: "1.5px solid rgba(167,139,250,0.4)", background: "rgba(167,139,250,0.1)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700, color: "#a78bfa" }}
            >
              📷 {capsulePhoto ? "Cambiar foto" : "Añadir foto"}
            </button>
            {capsulePhoto && (
              <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
                <img src={capsulePhoto} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, border: "2px solid rgba(167,139,250,0.4)" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                <button onClick={() => setCapsulePhoto(null)} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "0.875rem", border: "none", borderRadius: 14, cursor: saving ? "not-allowed" : "pointer", background: saving ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg,#8b5cf6,#a78bfa)", color: "#fff", fontWeight: 700, fontSize: "1rem", fontFamily: "inherit" }}
          >
            {saving ? "Sellando..." : "💎 Sellar Cápsula"}
          </button>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const readyCount = capsules.filter(c => !c.is_opened && canOpenCapsule(c)).length

  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#0d0d1f 0%,#1a0f2e 50%,#2d1b3e 100%)", display: "flex", flexDirection: "column" }}>
      <style>{APP_CSS}</style>

      {/* Header */}
      <div style={{ padding: "0.875rem 1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <button
            onClick={onBack}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >‹</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.1875rem", color: "#f1f5f9", margin: 0 }}>
              ⏳ Cápsulas del Tiempo
            </p>
            <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: 0 }}>Mensajes hacia el futuro</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {[
            { emoji: "💎", label: "Total",    value: capsules.length,                        color: "#a78bfa" },
            { emoji: "🔒", label: "Selladas", value: capsules.filter(c => !c.is_opened).length, color: "#60a5fa" },
            { emoji: "📬", label: "Abiertas", value: capsules.filter(c => c.is_opened).length,  color: "#34d399" },
          ].map((s, i) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "0.625rem 0.5rem", textAlign: "center", animation: `countFade 0.4s ease both`, animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{s.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: "1.25rem", color: s.color, fontFamily: "'Fredoka',sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: "0.5625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "0.5rem 0.875rem", display: "flex", gap: "0.375rem", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
        {([
          { id: "all",     label: "⏳ Todas",     color: "#a78bfa" },
          { id: "waiting", label: "🔒 Esperando", color: "#60a5fa" },
          { id: "ready",   label: "✉️ ¡Listas!",  color: "#f472b6" },
          { id: "opened",  label: "📬 Abiertas",  color: "#34d399" },
        ] as { id: CapsuleFilter; label: string; color: string }[]).map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0, padding: "0.4rem 0.75rem", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontWeight: 700, fontSize: "0.6875rem", whiteSpace: "nowrap",
                background: active ? `${f.color}22` : "rgba(255,255,255,0.05)",
                color: active ? f.color : "#64748b",
                border: active ? `1.5px solid ${f.color}44` : "1.5px solid transparent",
                transition: "all 0.2s",
              } as React.CSSProperties}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto" }}>
        {/* Ready banner */}
        {readyCount > 0 && (
          <div style={{ background: "rgba(167,139,250,0.15)", border: "1.5px solid rgba(167,139,250,0.4)", borderRadius: 16, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.875rem", animation: "capGlowPulse 2.5s ease infinite" }}>
            <span style={{ fontSize: "2rem" }}>✉️</span>
            <div>
              <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: "#c084fc", margin: 0 }}>
                {readyCount === 1 ? "¡Tienes una cápsula lista!" : `¡Tienes ${readyCount} cápsulas listas!`}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "#94a3b8", margin: 0 }}>Toca para abrir</p>
            </div>
          </div>
        )}

        {/* Create button */}
        <button
          onClick={() => setView("create")}
          style={{ padding: "0.75rem", border: "none", borderRadius: 14, cursor: "pointer", background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit" }}
        >
          💎 Crear Cápsula
        </button>

        {loading ? (
          <PhoneLoader />
        ) : filteredCapsules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "3.5rem", display: "block", animation: "capBounce 2.5s ease infinite" }}>⏳</span>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "#f1f5f9", margin: 0 }}>
              {filter === "all" ? "Sin cápsulas aún" : "Ninguna en esta categoría"}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>
              {filter === "all" ? "Guarda un mensaje para el futuro" : "Prueba otro filtro"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {filteredCapsules.map((c, i) => {
              const t = CAPSULE_TYPES.find((t) => t.id === c.type)
              const canOpen = canOpenCapsule(c)
              const days = daysUntil(c)
              const countdown = timeUntil(c)
              const r = 16
              const circ = 2 * Math.PI * r
              const fill = 1 - Math.min(days / 365, 1)
              const dash = fill * circ
              const isUrgent = !c.is_opened && !canOpen && days <= 7 && days > 0

              return (
                <div key={c.id} style={{ animation: `capsuleCardIn 0.4s ease both`, animationDelay: `${i * 0.07}s` }}>
                  <div
                    style={{
                      background: c.is_opened ? "rgba(255,255,255,0.04)" : canOpen ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.06)",
                      borderRadius: 16,
                      border: canOpen && !c.is_opened ? "1.5px solid rgba(167,139,250,0.5)" : `1.5px solid ${t?.color ?? "#a78bfa"}22`,
                      padding: "0.875rem",
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      boxShadow: canOpen && !c.is_opened ? "0 0 16px rgba(167,139,250,0.2)" : "none",
                    }}
                  >
                    {/* Ring or open icon */}
                    {c.is_opened ? (
                      <div style={{ flexShrink: 0, opacity: 0.4, fontSize: "1.5rem" }}>📬</div>
                    ) : canOpen ? (
                      <div style={{ flexShrink: 0, animation: "capsulePulse 1.4s ease infinite", fontSize: "1.75rem" }}>✉️</div>
                    ) : (
                      <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                        <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                          <circle cx="20" cy="20" r={r} fill="none" stroke={t?.color ?? "#a78bfa"} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "0.45rem", fontWeight: 700, color: t?.color ?? "#a78bfa", lineHeight: 1, textAlign: "center" }}>
                            {countdown}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => handleOpen(c)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        {t && <t.Icon size={13} color={t.color} />}
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#f1f5f9" }}>{t?.label}</span>
                        {c.photo_url && <span style={{ fontSize: "0.75rem" }}>📷</span>}
                      </div>

                      {/* Blurred message preview */}
                      {!c.is_opened && c.message && (
                        <p style={{ fontSize: "0.6875rem", color: "#94a3b8", margin: "0 0 4px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", filter: canOpen ? "none" : "blur(3px)", userSelect: "none" }}>
                          "{c.message.slice(0, 60)}"
                        </p>
                      )}

                      <div style={{ fontSize: "0.6875rem", color: canOpen && !c.is_opened ? "#c084fc" : "#64748b", fontWeight: canOpen && !c.is_opened ? 700 : 400 }}>
                        {c.is_opened
                          ? `Abierta el ${formatDate(c.unlock_date)}`
                          : canOpen ? "¡Lista para abrir! 🔓"
                          : c.unlock_at ? `Se abre el ${formatDateTime(c.unlock_at)}`
                          : `Se abre en ${countdown}`}
                      </div>

                      {isUrgent && (
                        <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.5625rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: days <= 3 ? "rgba(248,113,113,0.2)" : "rgba(251,191,36,0.2)", color: days <= 3 ? "#f87171" : "#fbbf24", border: days <= 3 ? "1px solid #f8717144" : "1px solid #fbbf2444", animation: "urgentBlink 1.2s ease infinite" }}>
                          ⚡ ¡Abre en {days} día{days !== 1 ? "s" : ""}!
                        </span>
                      )}
                    </div>

                    {!c.is_opened && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(c.id)
                            setEditMessage(c.message)
                            setEditDate(c.unlock_date)
                            setEditCapsulePhoto(c.photo_url ?? null)
                            if (c.unlock_at) {
                              const d = new Date(c.unlock_at)
                              setEditTime(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`)
                            } else { setEditTime("") }
                          }}
                          style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", padding: "0.3rem", borderRadius: 8, color: "#a78bfa", display: "flex", alignItems: "center" }}
                        ><Pencil size={12} /></button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                          style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", padding: "0.3rem", borderRadius: 8, color: "#64748b", display: "flex", alignItems: "center" }}
                        ><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>

                  {/* Edit panel */}
                  {editingId === c.id && (
                    <div style={{ marginTop: 6, background: "rgba(167,139,250,0.1)", border: "1.5px solid rgba(167,139,250,0.25)", borderRadius: 14, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {showEditCapsuleGallery && (
                        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column" }} onClick={() => setShowEditCapsuleGallery(false)}>
                          <div style={{ marginTop: "auto", background: "#1a1a2e", borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f1f5f9" }}>Elegir foto</span>
                              <button onClick={() => setShowEditCapsuleGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "#94a3b8", lineHeight: 1 }}>×</button>
                            </div>
                            {loadingGallery ? <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Cargando...</div>
                            : galleryPhotos.length === 0 ? <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Sin fotos</div>
                            : (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                                {galleryPhotos.map(p => (
                                  <div key={p.id} onClick={() => { setEditCapsulePhoto(p.image_url); setShowEditCapsuleGallery(false) }}
                                    style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", border: editCapsulePhoto === p.image_url ? "3px solid #a78bfa" : "2px solid transparent" }}>
                                    <img src={p.thumb_url ?? p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <textarea style={{ ...inputStyle, resize: "none", minHeight: 80, fontFamily: "Georgia, serif" }} rows={3} value={editMessage} onChange={(e) => setEditMessage(e.target.value)} maxLength={2000} autoFocus />
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <input type="date" style={{ ...inputStyle, flex: 1 }} value={editDate} min={now} onChange={(e) => setEditDate(e.target.value)} />
                        <input type="time" style={{ ...inputStyle, flex: "0 0 100px" }} value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button type="button" onClick={() => { setShowEditCapsuleGallery(true); loadGallery() }}
                          style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", borderRadius: 999, border: "1.5px solid rgba(167,139,250,0.4)", background: "rgba(167,139,250,0.1)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, color: "#a78bfa" }}>
                          📷 {editCapsulePhoto ? "Cambiar foto" : "Añadir foto"}
                        </button>
                        {editCapsulePhoto && (
                          <div style={{ position: "relative" }}>
                            <img src={editCapsulePhoto} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(167,139,250,0.4)" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                            <button onClick={() => setEditCapsulePhoto(null)} style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 14, height: 14, cursor: "pointer", fontSize: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleEditSave(c)} disabled={saving} style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", color: "#fff", fontWeight: 700, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                          {saving ? "..." : "Guardar"}
                        </button>
                        <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: "0.5rem", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontWeight: 700, fontSize: "0.8125rem", fontFamily: "inherit" }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
