"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { TimeCapsule, CapsuleType } from "@/types"
import { formatDate } from "@/lib/utils"
import { PhoneLoader } from "@/components/features/phone-loader"
import { Trash2, Heart, Star, Trophy, HelpCircle, MessageSquare, Calendar, Timer, Lock, MailOpen, Gem, Sparkles, Upload, Mail, Pencil, Clock } from "lucide-react"
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

  useEffect(() => { loadCapsules() }, [])

  async function authFetch(path: string, init?: RequestInit) {
    const auth = getFirebaseAuth()
    const token = await auth.currentUser?.getIdToken()
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

  async function handleSave() {
    if (!message.trim()) { toast.error("Escribe un mensaje"); return }
    const unlock_date = useCustom && customDate
      ? customDate
      : new Date(Date.now() + unlockDays * 86_400_000).toISOString().split("T")[0]
    // If custom time is set, compute the full unlock_at timestamp in local time
    let unlock_at: string | undefined
    if (useCustom && customDate && customTime) {
      unlock_at = new Date(`${customDate}T${customTime}:00`).toISOString()
    }
    setSaving(true)
    try {
      await authFetch("/api/capsules", {
        method: "POST",
        body: JSON.stringify({ message: message.trim(), type: capsuleType, unlock_date, unlock_at }),
      })
      toast.success("Cápsula creada 💎")
      setMessage("")
      setView("list")
      loadCapsules()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
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
    if (!confirm("¿Abrir esta cápsula ahora?")) return
    try {
      await authFetch(`/api/capsules/${capsule.id}/open`, { method: "PATCH" })
      await loadCapsules()
      const updated = { ...capsule, is_opened: true }
      setSelected(updated)
      setView("read")
      toast.success("¡Cápsula abierta! ✨")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ""
      if (msg.includes("not_ready")) toast.error("🔒 Esta cápsula aún no está lista para abrir")
      else toast.error("Error al abrir")
    }
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
        body: JSON.stringify({ message: editMessage.trim(), unlock_date: newDate, unlock_at: newUnlockAt }),
      })
      toast.success("Cápsula actualizada ✨")
      setEditingId(null)
      loadCapsules()
    } catch { toast.error("Error al actualizar") } finally { setSaving(false) }
  }

  async function handleDelete(capsule: TimeCapsule) {
    if (!confirm("¿Eliminar esta cápsula?")) return
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

  if (view === "read" && selected) {
    const t = CAPSULE_TYPES.find((ct) => ct.id === selected.type)
    const typeColors: Record<string, string> = {
      memory: "#dbeafe", dream: "#ede9fe", love: "#fce7f3",
      achievement: "#fef9c3", mystery: "#f3e8ff", reflection: "#dcfce7",
    }
    const bgColor = typeColors[selected.type] ?? "var(--muted)"
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Gem size={14} /> Cápsula Abierta</span>
        </div>
        <div className="app-content-body" style={{ alignItems: "center", gap: "0.875rem" }}>
          {/* Type badge */}
          <div style={{
            background: bgColor, borderRadius: "var(--radius-xl)",
            padding: "1.25rem 2rem", textAlign: "center", width: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem",
          }}>
            {t ? <t.Icon size={40} color={t.color} /> : <Gem size={40} color="var(--primary)" />}
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "var(--foreground)" }}>
              Cápsula de {t?.label}
            </span>
            <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>
              Creada el {formatDate(selected.created_at)}
            </span>
          </div>
          {/* Message card */}
          <div style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.125rem",
            width: "100%",
            border: "1.5px solid var(--border)",
            boxShadow: "0 2px 12px rgba(139,92,246,0.08)",
          }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <Mail size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Mensaje
            </p>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
              {selected.message}
            </p>
          </div>
          {/* Sealed date */}
          <div style={{ textAlign: "center", width: "100%" }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>
              <Calendar size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Fecha de apertura: {formatDate(selected.unlock_date)}
            </span>
          </div>
          <button
            className="btn btn-outline"
            style={{ width: "100%", fontSize: "0.8125rem" }}
            onClick={async () => {
              const t = CAPSULE_TYPES.find(ct => ct.id === selected.type)
              const text = `Cápsula de ${t?.label ?? "Tiempo"}\n\n${selected.message}\n\n— Abierta el ${formatDate(selected.unlock_date)}`
              if (navigator.share) {
                try { await navigator.share({ title: "Nuestra Cápsula del Tiempo", text }) } catch { /* cancelled */ }
              } else {
                try {
                  await navigator.clipboard.writeText(text)
                  toast.success("¡Copiado al portapapeles! 📋")
                } catch { toast.error("No se pudo copiar") }
              }
            }}
          >
            <Upload size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Compartir cápsula
          </button>
        </div>
      </>
    )
  }

  if (view === "create") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} /> Nueva Cápsula</span>
        </div>
        <div className="app-content-body">
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={13} /> Tu Mensaje</label>
            <textarea
              className="textarea"
              rows={5}
              placeholder={"Querido yo del futuro...\n\nHoy es un día especial porque..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", alignSelf: "flex-end" }}>
              {message.length}/2000
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Cápsula</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
              {CAPSULE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCapsuleType(t.id)}
                  style={{
                    padding: "0.5rem 0.25rem",
                    borderRadius: "var(--radius-md)",
                    border: capsuleType === t.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                    background: capsuleType === t.id ? "var(--primary-lighter)" : "white",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    fontFamily: "inherit",
                  }}
                >
                  <t.Icon size={18} color={capsuleType === t.id ? "var(--primary)" : t.color} />
                  <span style={{ fontSize: "0.625rem", fontWeight: 600, color: capsuleType === t.id ? "var(--primary)" : "var(--foreground-light)" }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> Fecha de Apertura</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.375rem" }}>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => { setUnlockDays(p.days); setUseCustom(false) }}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "var(--radius-md)",
                    border: unlockDays === p.days && !useCustom ? "2px solid var(--primary)" : "2px solid var(--border)",
                    background: unlockDays === p.days && !useCustom ? "var(--primary-lighter)" : "white",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: unlockDays === p.days && !useCustom ? "var(--primary)" : "var(--foreground-light)",
                  }}
                >
                  <Calendar size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{p.label}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                style={{
                  padding: "0.5rem",
                  borderRadius: "var(--radius-md)",
                  border: useCustom ? "2px solid var(--primary)" : "2px solid var(--border)",
                  background: useCustom ? "var(--primary-lighter)" : "white",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: useCustom ? "var(--primary)" : "var(--foreground-light)",
                }}
              >
                🎯 Personalizada
              </button>
            </div>
            {useCustom && (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <input
                  type="date"
                  className="input"
                  value={customDate}
                  min={now}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="time"
                    className="input"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", whiteSpace: "nowrap" }}>
                    hora exacta (opcional)
                  </span>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Crear Cápsula"}
          </button>
        </div>
      </>
    )
  }

  // List view
  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={14} /> Cápsulas del Tiempo</span>
      </div>
      <div className="app-content-body">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", textAlign: "center" }}>
          {[
            { label: "Total", value: capsules.length },
            { label: "Pendientes", value: capsules.filter((c) => !c.is_opened).length },
            { label: "Abiertas", value: capsules.filter((c) => c.is_opened).length },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--muted)", borderRadius: "var(--radius-md)", padding: "0.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--primary)" }}>{s.value}</div>
              <div style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="pill-tab-container">
          {([
            { id: "all",     label: "Todas" },
            { id: "waiting", label: "Esperando" },
            { id: "ready",   label: "¡Listas!" },
            { id: "opened",  label: "Abiertas" },
          ] as { id: CapsuleFilter; label: string }[]).map((f) => (
            <button
              key={f.id}
              className={`pill-tab-btn${filter === f.id ? " active" : ""}`}
              onClick={() => setFilter(f.id)}
              style={{ fontSize: "0.625rem" }}
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
            <div className="animate-glow-pulse" style={{
              background: "linear-gradient(135deg, #fdf4ff, #fce7f3)",
              border: "2px solid var(--primary-light)",
              borderRadius: "var(--radius-lg)",
              padding: "0.75rem 1rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
            }}>
              <MailOpen size={24} color="var(--primary)" />
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--primary)" }}>
                  {readyCount === 1 ? "¡Tienes una cápsula lista!" : `¡Tienes ${readyCount} cápsulas listas!`}
                </p>
                <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>Toca para abrir</p>
              </div>
            </div>
          )
        })()}

        {loading ? (
          <PhoneLoader />
        ) : filteredCapsules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <div className="animate-bounce-slow"><Timer size={36} color="var(--primary)" /></div>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>
              {filter === "all" ? "Sin cápsulas aún" : "Ninguna en esta categoría"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
              {filter === "all" ? "Guarda un mensaje para el futuro" : "Prueba otro filtro"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filteredCapsules.map((c) => {
              const t = CAPSULE_TYPES.find((t) => t.id === c.type)
              const canOpen = canOpenCapsule(c)
              const days = daysUntil(c)
              const countdown = timeUntil(c)
              return (
                <div key={c.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.875rem",
                    background: c.is_opened
                      ? "var(--muted)"
                      : canOpen
                      ? "linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)"
                      : "white",
                    borderRadius: "var(--radius-lg)",
                    border: canOpen && !c.is_opened
                      ? "2px solid var(--primary-light)"
                      : "1px solid var(--border)",
                    opacity: c.is_opened ? 0.65 : 1,
                  }}
                >
                  {/* Icon / ring */}
                  {c.is_opened ? (
                    <div style={{ flexShrink: 0, opacity: 0.5 }}><MailOpen size={28} color="var(--foreground-muted)" /></div>
                  ) : canOpen ? (
                    <div className="animate-glow-pulse" style={{ flexShrink: 0 }}><MailOpen size={30} color="var(--primary)" /></div>
                  ) : (
                    /* Mini countdown ring */
                    <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                      {(() => {
                        const r = 14
                        const circ = 2 * Math.PI * r
                        const fill = 1 - Math.min(days / 365, 1)
                        const dash = fill * circ
                        return (
                          <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="18" cy="18" r={r} fill="none" stroke="var(--muted)" strokeWidth="3.5" />
                            <circle cx="18" cy="18" r={r} fill="none" stroke="var(--primary)" strokeWidth="3.5"
                              strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
                          </svg>
                        )
                      })()}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.5rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1, textAlign: "center" }}>
                          {countdown}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => handleOpen(c)}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>
                      {t && <t.Icon size={14} color={t.color} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />}{t?.label}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: canOpen && !c.is_opened ? "var(--primary)" : "var(--foreground-muted)", fontWeight: canOpen && !c.is_opened ? 700 : 400 }}>
                      {c.is_opened
                        ? `Abierta el ${formatDate(c.unlock_date)}`
                        : canOpen
                        ? "¡Lista para abrir!"
                        : c.unlock_at
                        ? `Se abre el ${formatDateTime(c.unlock_at)}`
                        : `Se abre en ${countdown}`}
                    </div>
                    {canOpen && !c.is_opened && (
                      <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#059669", marginTop: "0.125rem" }}>
                        ¡Ábrela!
                      </div>
                    )}
                  </div>

                  {/* Edit + delete (only for unopened) */}
                  {!c.is_opened && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(c.id)
                          setEditMessage(c.message)
                          setEditDate(c.unlock_date)
                          if (c.unlock_at) {
                            const d = new Date(c.unlock_at)
                            setEditTime(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`)
                          } else { setEditTime("") }
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "4px", display: "flex", alignItems: "center" }}
                      ><Pencil size={13} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "4px", display: "flex", alignItems: "center", opacity: 0.6 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {editingId === c.id && (
                  <div
                    style={{
                      marginTop: "0.375rem",
                      background: "var(--primary-lighter)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <textarea
                      className="textarea"
                      rows={3}
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      maxLength={2000}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <input type="date" className="input" value={editDate} min={now} onChange={(e) => setEditDate(e.target.value)} style={{ flex: 1 }} />
                      <input type="time" className="input" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={{ flex: "0 0 100px" }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-primary" onClick={() => handleEditSave(c)} disabled={saving} style={{ flex: 1, fontSize: "0.75rem" }}>
                        {saving ? "..." : "Guardar"}
                      </button>
                      <button className="btn btn-outline" onClick={() => setEditingId(null)} style={{ flex: 1, fontSize: "0.75rem" }}>Cancelar</button>
                    </div>
                  </div>
                )}
                </div>
              )
            })}
          </div>
        )}

        <button className="btn btn-primary" onClick={() => setView("create")}>
          Crear Cápsula
        </button>
      </div>
    </>
  )
}
