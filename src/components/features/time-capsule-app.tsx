"use client"

import { useState, useEffect, useRef } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { TimeCapsule, CapsuleType } from "@/types"
import { formatDate } from "@/lib/utils"
import { PhoneLoader } from "@/components/features/phone-loader"
import { Trash2, Heart, Star, Trophy, HelpCircle, MessageSquare, Calendar, Timer, Lock, MailOpen, Gem, Sparkles, Upload, Mail, Pencil, Clock } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import type { LucideProps } from "lucide-react"

const CAPSULE_TYPES: { id: CapsuleType; Icon: React.FC<LucideProps>; label: string; desc: string; color: string }[] = [
  { id: "memory",      Icon: Heart,          label: "Recuerdo",  desc: "Momentos especiales",    color: "#3b82f6" },
  { id: "dream",       Icon: Star,           label: "Sueño",     desc: "Metas y aspiraciones",   color: "#8b5cf6" },
  { id: "love",        Icon: Heart,          label: "Amor",      desc: "Mensajes de corazón",    color: "#ec4899" },
  { id: "achievement", Icon: Trophy,         label: "Logro",     desc: "Éxitos personales",      color: "#f59e0b" },
  { id: "mystery",     Icon: HelpCircle,     label: "Misterio",  desc: "Sorpresas ocultas",      color: "#6d28d9" },
  { id: "reflection",  Icon: MessageSquare,  label: "Reflexión", desc: "Pensamientos profundos", color: "#10b981" },
]

const DATE_PRESETS = [
  { days: 30,  label: "1 Mes" },
  { days: 90,  label: "3 Meses" },
  { days: 180, label: "6 Meses" },
  { days: 365, label: "1 Año" },
]

type CapsuleFilter = "all" | "waiting" | "ready" | "opened"
interface Props { onBack: () => void }
type View = "list" | "create" | "read"

const CONFETTI = ["💜", "✨", "💕", "⭐", "🌟"]

const CAPSULE_CSS = `
@keyframes capsuleFloatUp {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-120px) scale(1.4); }
}
@keyframes capsulePop {
  0%   { transform: scale(0.7); opacity: 0; }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes capsulePulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.05); }
}
@keyframes urgentPulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: 0.7; transform: scale(1.04); }
}
@keyframes capsuleCardIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes readyGlow {
  0%,100% { box-shadow: 0 0 12px rgba(139,92,246,0.3); }
  50%     { box-shadow: 0 0 28px rgba(139,92,246,0.7), 0 0 48px rgba(236,72,153,0.3); }
}
`

const DARK_BG = "linear-gradient(160deg, #0d0d1a 0%, #1a0f2e 55%, #0f1a2e 100%)"

const DARK_HEADER: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "0.5rem",
  padding: "0.75rem 1rem",
  background: "linear-gradient(135deg, #1a0f2e 0%, #0d0d1a 100%)",
  borderBottom: "1px solid rgba(139,92,246,0.2)",
  flexShrink: 0,
}

const DARK_BODY: React.CSSProperties = {
  flex: 1, overflowY: "auto", padding: "0.75rem",
  display: "flex", flexDirection: "column", gap: "0.75rem",
  background: DARK_BG,
}

const INPUT_DARK: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.875rem", borderRadius: "12px",
  border: "1.5px solid rgba(139,92,246,0.25)", background: "rgba(255,255,255,0.06)",
  color: "white", fontFamily: "inherit", fontSize: "0.875rem",
  boxSizing: "border-box", outline: "none",
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

  // Cap-A: opening animation
  const [openingCapsule, setOpeningCapsule] = useState<TimeCapsule | null>(null)
  const [countdownStep, setCountdownStep] = useState<number>(0)
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cap-B: photo in capsule
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
          message: message.trim(), type: capsuleType, unlock_date, unlock_at,
          ...(capsulePhoto ? { photo_url: capsulePhoto } : {}),
        }),
      })
      toast.success("Cápsula creada 💎")
      setMessage(""); setCapsulePhoto(null); setView("list"); loadCapsules()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  function startOpeningAnimation(capsule: TimeCapsule) {
    setOpeningCapsule(capsule)
    setCountdownStep(1)
    let step = 1
    function next() {
      step++; setCountdownStep(step)
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
      setSelected(updated); setOpeningCapsule(null); setCountdownStep(0); setView("read")
      toast.success("¡Cápsula abierta! ✨")
    } catch (e: unknown) {
      setOpeningCapsule(null); setCountdownStep(0)
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
          message: editMessage.trim(), unlock_date: newDate, unlock_at: newUnlockAt,
          ...(editCapsulePhoto !== null ? { photo_url: editCapsulePhoto } : {}),
        }),
      })
      toast.success("Cápsula actualizada ✨"); setEditingId(null); setEditCapsulePhoto(null); loadCapsules()
    } catch { toast.error("Error al actualizar") } finally { setSaving(false) }
  }

  async function handleDelete(capsule: TimeCapsule) {
    if (!await showConfirm({ title: "Eliminar cápsula", danger: true })) return
    try {
      await authFetch(`/api/capsules/${capsule.id}`, { method: "DELETE" })
      toast.success("Cápsula eliminada"); loadCapsules()
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

  // Cap-A: opening animation overlay
  if (openingCapsule && countdownStep > 0) {
    const t = CAPSULE_TYPES.find(ct => ct.id === openingCapsule.type)
    const COUNTDOWN_LABELS = ["", "3", "2", "1", "✨", ""]
    const label = COUNTDOWN_LABELS[countdownStep] ?? ""
    return (
      <>
        <style>{CAPSULE_CSS}</style>
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "linear-gradient(135deg, #2d1b3e 0%, #1a0f2e 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "1.5rem",
        }}>
          {CONFETTI.map((emoji, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${15 + i * 17}%`,
              top: `${30 + (i % 3) * 15}%`,
              fontSize: "1.5rem",
              animation: countdownStep >= 4 ? `capsuleFloatUp ${0.8 + i * 0.15}s ease forwards ${i * 0.1}s` : "none",
              opacity: countdownStep >= 4 ? 1 : 0,
              pointerEvents: "none",
            }}>{emoji}</div>
          ))}
          <div style={{ animation: "capsulePulse 1.2s ease infinite" }}>
            {t ? <t.Icon size={72} color={t.color} /> : <Gem size={72} color="#8b5cf6" />}
          </div>
          {label && (
            <div key={countdownStep} style={{
              fontFamily: "'Fredoka',sans-serif",
              fontSize: countdownStep <= 3 ? "5rem" : "3rem",
              fontWeight: 700, color: "white",
              animation: "capsulePop 0.4s ease",
              textShadow: "0 0 30px rgba(139,92,246,0.8)",
            }}>{label}</div>
          )}
          <p style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.6)" }}>
            Abriendo cápsula...
          </p>
        </div>
      </>
    )
  }

  // Read view
  if (view === "read" && selected) {
    const t = CAPSULE_TYPES.find((ct) => ct.id === selected.type)
    return (
      <>
        <style>{CAPSULE_CSS}</style>
        <div style={DARK_HEADER}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "rgba(255,255,255,0.8)", padding: "0 0.25rem", lineHeight: 1 }}>‹</button>
          <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            <Gem size={14} color="#8b5cf6" /> Cápsula Abierta
          </span>
        </div>
        <div style={{ ...DARK_BODY, alignItems: "center", gap: "0.875rem" }}>
          {/* Type banner */}
          <div style={{
            background: `${t?.color ?? "#8b5cf6"}18`,
            borderRadius: "20px", padding: "1.25rem 2rem", textAlign: "center", width: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem",
            border: `1.5px solid ${t?.color ?? "#8b5cf6"}33`,
            boxSizing: "border-box",
          }}>
            {t ? <t.Icon size={40} color={t.color} /> : <Gem size={40} color="#8b5cf6" />}
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "white" }}>
              Cápsula de {t?.label}
            </span>
            <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.45)" }}>
              Creada el {formatDate(selected.created_at)}
            </span>
          </div>

          {selected.photo_url && (
            <img
              src={selected.photo_url} alt=""
              style={{ width: "100%", borderRadius: "16px", objectFit: "cover", maxHeight: 200, filter: "sepia(0.3) saturate(0.9)" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          )}

          <div style={{
            background: "rgba(255,255,255,0.06)", borderRadius: "16px",
            padding: "1.125rem", width: "100%",
            border: `1px solid ${t?.color ?? "#8b5cf6"}22`,
            boxSizing: "border-box",
          }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: t?.color ?? "#8b5cf6", marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <Mail size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Mensaje
            </p>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "rgba(255,255,255,0.88)", whiteSpace: "pre-wrap" }}>
              {selected.message}
            </p>
          </div>

          <div style={{ textAlign: "center", width: "100%" }}>
            <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)" }}>
              <Calendar size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Fecha de apertura: {formatDate(selected.unlock_date)}
            </span>
          </div>

          <button
            onClick={async () => {
              const typeLabel = CAPSULE_TYPES.find(ct => ct.id === selected.type)?.label ?? "Tiempo"
              const text = `Cápsula de ${typeLabel}\n\n${selected.message}\n\n— Abierta el ${formatDate(selected.unlock_date)}`
              if (navigator.share) {
                try { await navigator.share({ title: "Nuestra Cápsula del Tiempo", text }) } catch { /* cancelled */ }
              } else {
                try { await navigator.clipboard.writeText(text); toast.success("¡Copiado al portapapeles! 📋") }
                catch { toast.error("No se pudo copiar") }
              }
            }}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: "14px",
              border: "1.5px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)",
              color: "#a78bfa", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Upload size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Compartir cápsula
          </button>
        </div>
      </>
    )
  }

  // Create view
  if (view === "create") {
    return (
      <>
        <style>{CAPSULE_CSS}</style>
        <div style={DARK_HEADER}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "rgba(255,255,255,0.8)", padding: "0 0.25rem", lineHeight: 1 }}>‹</button>
          <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color="#8b5cf6" /> Nueva Cápsula
          </span>
        </div>
        <div style={DARK_BODY}>
          {/* Message */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
              <Mail size={13} /> Tu Mensaje
            </label>
            <textarea
              style={{ ...INPUT_DARK, resize: "none" }}
              rows={5}
              placeholder={"Querido yo del futuro...\n\nHoy es un día especial porque..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.3)", alignSelf: "flex-end" }}>
              {message.length}/2000
            </span>
          </div>

          {/* Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Tipo de Cápsula</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
              {CAPSULE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCapsuleType(t.id)}
                  style={{
                    padding: "0.5rem 0.25rem", borderRadius: "12px",
                    border: capsuleType === t.id ? `2px solid ${t.color}` : "2px solid rgba(255,255,255,0.1)",
                    background: capsuleType === t.id ? `${t.color}20` : "rgba(255,255,255,0.05)",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  <t.Icon size={18} color={t.color} />
                  <span style={{ fontSize: "0.625rem", fontWeight: 600, color: capsuleType === t.id ? t.color : "rgba(255,255,255,0.5)" }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={13} /> Fecha de Apertura
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.375rem" }}>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => { setUnlockDays(p.days); setUseCustom(false) }}
                  style={{
                    padding: "0.5rem", borderRadius: "12px",
                    border: unlockDays === p.days && !useCustom ? "2px solid #8b5cf6" : "2px solid rgba(255,255,255,0.1)",
                    background: unlockDays === p.days && !useCustom ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                    cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                    color: unlockDays === p.days && !useCustom ? "#a78bfa" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <Calendar size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{p.label}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                style={{
                  padding: "0.5rem", borderRadius: "12px",
                  border: useCustom ? "2px solid #8b5cf6" : "2px solid rgba(255,255,255,0.1)",
                  background: useCustom ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                  cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                  color: useCustom ? "#a78bfa" : "rgba(255,255,255,0.5)",
                }}
              >
                🎯 Personalizada
              </button>
            </div>
            {useCustom && (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <input type="date" style={INPUT_DARK} value={customDate} min={now} onChange={(e) => setCustomDate(e.target.value)} />
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="time" style={{ ...INPUT_DARK, flex: 1 }} value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
                  <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>hora (opcional)</span>
                </div>
              </div>
            )}
          </div>

          {/* Cap-B: photo gallery picker for create */}
          {showCapsuleGallery && (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }}
              onClick={() => setShowCapsuleGallery(false)}
            >
              <div style={{ marginTop: "auto", background: "#1a0f2e", borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "60vh", overflowY: "auto", border: "1px solid rgba(139,92,246,0.3)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1rem", color: "white" }}>Elegir foto</span>
                  <button onClick={() => setShowCapsuleGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>×</button>
                </div>
                {loadingGallery ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Cargando fotos...</div>
                ) : galleryPhotos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Sin fotos aún</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                    {galleryPhotos.map(p => (
                      <div key={p.id} onClick={() => { setCapsulePhoto(p.image_url); setShowCapsuleGallery(false) }}
                        style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", border: capsulePhoto === p.image_url ? "3px solid #8b5cf6" : "2px solid transparent" }}>
                        <img src={p.thumb_url ?? p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>📷 Foto (opcional)</label>
            <button
              type="button"
              onClick={() => { setShowCapsuleGallery(true); loadGallery() }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", borderRadius: "999px", border: "1.5px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600, color: "#a78bfa" }}
            >
              📷 Añadir foto
            </button>
            {capsulePhoto && (
              <div style={{ position: "relative", display: "inline-block", marginTop: "0.5rem" }}>
                <img src={capsulePhoto} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "2px solid rgba(139,92,246,0.4)" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                <button onClick={() => setCapsulePhoto(null)} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.75rem", borderRadius: "14px", border: "none",
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white",
              fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
            }}
          >
            {saving ? "Guardando..." : "💎 Crear Cápsula"}
          </button>
        </div>
      </>
    )
  }

  // List view
  return (
    <>
      <style>{CAPSULE_CSS}</style>

      <div style={DARK_HEADER}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "rgba(255,255,255,0.8)", padding: "0 0.25rem", lineHeight: 1 }}>‹</button>
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={14} color="#8b5cf6" /> Cápsulas del Tiempo
        </span>
      </div>

      <div style={DARK_BODY}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", textAlign: "center" }}>
          {[
            { label: "Total",     value: capsules.length },
            { label: "Pendientes", value: capsules.filter((c) => !c.is_opened).length },
            { label: "Abiertas",  value: capsules.filter((c) => c.is_opened).length },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "12px", padding: "0.5rem", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "#a78bfa" }}>{s.value}</div>
              <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: "0.25rem", padding: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "999px" }}>
          {([
            { id: "all",     label: "Todas" },
            { id: "waiting", label: "Esperando" },
            { id: "ready",   label: "¡Listas!" },
            { id: "opened",  label: "Abiertas" },
          ] as { id: CapsuleFilter; label: string }[]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flex: 1, padding: "0.3rem 0.25rem", borderRadius: "999px", border: "none",
                background: filter === f.id ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "transparent",
                color: filter === f.id ? "white" : "rgba(255,255,255,0.4)",
                fontFamily: "inherit", fontSize: "0.5625rem", fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Ready banner */}
        {(() => {
          const readyCount = capsules.filter(c => !c.is_opened && canOpenCapsule(c)).length
          if (!readyCount) return null
          return (
            <div style={{
              background: "rgba(139,92,246,0.12)",
              border: "1.5px solid rgba(139,92,246,0.35)",
              borderRadius: "16px", padding: "0.75rem 1rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
              animation: "readyGlow 2.5s ease-in-out infinite",
            }}>
              <MailOpen size={24} color="#8b5cf6" />
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#a78bfa", margin: 0 }}>
                  {readyCount === 1 ? "¡Tienes una cápsula lista!" : `¡Tienes ${readyCount} cápsulas listas!`}
                </p>
                <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>Toca para abrir</p>
              </div>
            </div>
          )
        })()}

        {loading ? (
          <PhoneLoader />
        ) : filteredCapsules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <div style={{ fontSize: "2.5rem", opacity: 0.4 }}>⏳</div>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
              {filter === "all" ? "Sin cápsulas aún" : "Ninguna en esta categoría"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
              {filter === "all" ? "Guarda un mensaje para el futuro" : "Prueba otro filtro"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filteredCapsules.map((c, idx) => {
              const t = CAPSULE_TYPES.find((t) => t.id === c.type)
              const canOpen = canOpenCapsule(c)
              const days = daysUntil(c)
              const countdown = timeUntil(c)
              return (
                <div key={c.id} style={{ animation: "capsuleCardIn 0.3s ease both", animationDelay: `${idx * 0.04}s` }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.875rem",
                      background: c.is_opened
                        ? "rgba(255,255,255,0.03)"
                        : canOpen
                        ? "rgba(139,92,246,0.1)"
                        : "rgba(255,255,255,0.05)",
                      borderRadius: editingId === c.id ? "14px 14px 0 0" : "14px",
                      border: canOpen && !c.is_opened
                        ? "1.5px solid rgba(139,92,246,0.4)"
                        : `1px solid rgba(255,255,255,0.07)`,
                      borderLeft: `4px solid ${c.is_opened ? "rgba(255,255,255,0.12)" : t?.color ?? "#8b5cf6"}`,
                      opacity: c.is_opened ? 0.6 : 1,
                      boxShadow: canOpen && !c.is_opened ? "0 0 16px rgba(139,92,246,0.25)" : "none",
                    }}
                  >
                    {/* Icon / ring */}
                    {c.is_opened ? (
                      <div style={{ flexShrink: 0, opacity: 0.4 }}><MailOpen size={28} color="rgba(255,255,255,0.5)" /></div>
                    ) : canOpen ? (
                      <div style={{ flexShrink: 0, animation: "capsulePulse 1.5s ease-in-out infinite" }}>
                        <MailOpen size={30} color="#8b5cf6" />
                      </div>
                    ) : (
                      <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                        {(() => {
                          const r = 14
                          const circ = 2 * Math.PI * r
                          const fill = 1 - Math.min(days / 365, 1)
                          const dash = fill * circ
                          return (
                            <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
                              <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
                              <circle cx="18" cy="18" r={r} fill="none" stroke={t?.color ?? "#8b5cf6"} strokeWidth="3.5"
                                strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
                            </svg>
                          )
                        })()}
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "0.5rem", fontWeight: 700, color: t?.color ?? "#a78bfa", lineHeight: 1, textAlign: "center" }}>
                            {countdown}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => handleOpen(c)}>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "white", display: "flex", alignItems: "center", gap: 4, marginBottom: "2px" }}>
                        {t && <t.Icon size={14} color={t.color} />}{t?.label}
                        {c.photo_url && <span style={{ fontSize: "0.75rem" }}>📷</span>}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: canOpen && !c.is_opened ? "#a78bfa" : "rgba(255,255,255,0.4)", fontWeight: canOpen && !c.is_opened ? 700 : 400 }}>
                        {c.is_opened
                          ? `Abierta el ${formatDate(c.unlock_date)}`
                          : canOpen
                          ? "¡Lista para abrir!"
                          : c.unlock_at
                          ? `Se abre el ${formatDateTime(c.unlock_at)}`
                          : `Se abre en ${countdown}`}
                      </div>
                      {!c.is_opened && !canOpen && (
                        <div style={{
                          display: "inline-flex", alignItems: "center", marginTop: "0.25rem",
                          padding: "1px 8px", borderRadius: "999px", fontSize: "0.5625rem", fontWeight: 700,
                          background: days === 0
                            ? "rgba(16,185,129,0.2)"
                            : days <= 7
                            ? "rgba(245,158,11,0.2)"
                            : "rgba(139,92,246,0.15)",
                          color: days === 0 ? "#6ee7b7" : days <= 7 ? "#fcd34d" : "#a78bfa",
                          animation: days > 0 && days <= 7 ? "urgentPulse 1.5s ease-in-out infinite" : "none",
                        }}>
                          {days === 0 ? "¡Lista para abrir! 🔓" : days <= 7 ? `¡Abre en ${days} días! 🔓` : `Se abre en ${days} días`}
                        </div>
                      )}
                    </div>

                    {!c.is_opened && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(c.id); setEditMessage(c.message); setEditDate(c.unlock_date)
                            setEditCapsulePhoto(c.photo_url ?? null)
                            if (c.unlock_at) {
                              const d = new Date(c.unlock_at)
                              setEditTime(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`)
                            } else { setEditTime("") }
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#8b5cf6", padding: "4px", display: "flex", alignItems: "center" }}
                        ><Pencil size={13} /></button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: "4px", display: "flex", alignItems: "center" }}
                        ><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {editingId === c.id && (
                    <div style={{
                      background: "rgba(139,92,246,0.08)", borderRadius: "0 0 14px 14px",
                      padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem",
                      border: "1px solid rgba(139,92,246,0.2)", borderTop: "none",
                    }}>
                      {showEditCapsuleGallery && (
                        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }}
                          onClick={() => setShowEditCapsuleGallery(false)}>
                          <div style={{ marginTop: "auto", background: "#1a0f2e", borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1rem", color: "white" }}>Elegir foto</span>
                              <button onClick={() => setShowEditCapsuleGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>×</button>
                            </div>
                            {loadingGallery ? (
                              <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Cargando...</div>
                            ) : galleryPhotos.length === 0 ? (
                              <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Sin fotos</div>
                            ) : (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                                {galleryPhotos.map(p => (
                                  <div key={p.id} onClick={() => { setEditCapsulePhoto(p.image_url); setShowEditCapsuleGallery(false) }}
                                    style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", border: editCapsulePhoto === p.image_url ? "3px solid #8b5cf6" : "2px solid transparent" }}>
                                    <img src={p.thumb_url ?? p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <textarea style={{ ...INPUT_DARK, resize: "none" }} rows={3} value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)} maxLength={2000} autoFocus />
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <input type="date" style={{ ...INPUT_DARK, flex: 1 }} value={editDate} min={now} onChange={(e) => setEditDate(e.target.value)} />
                        <input type="time" style={{ ...INPUT_DARK, flex: "0 0 100px" }} value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button type="button" onClick={() => { setShowEditCapsuleGallery(true); loadGallery() }}
                          style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", borderRadius: "999px", border: "1.5px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "#a78bfa" }}>
                          📷 {editCapsulePhoto ? "Cambiar foto" : "Añadir foto"}
                        </button>
                        {editCapsulePhoto && (
                          <div style={{ position: "relative" }}>
                            <img src={editCapsulePhoto} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(139,92,246,0.3)" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                            <button onClick={() => setEditCapsulePhoto(null)} style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 14, height: 14, cursor: "pointer", fontSize: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleEditSave(c)} disabled={saving}
                          style={{ flex: 1, padding: "0.5rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                        >{saving ? "..." : "Guardar"}</button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ flex: 1, padding: "0.5rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                        >Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setView("create")}
          style={{
            padding: "0.75rem", borderRadius: "14px", border: "none",
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white",
            fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
          }}
        >
          💎 Crear Cápsula
        </button>
      </div>
    </>
  )
}
