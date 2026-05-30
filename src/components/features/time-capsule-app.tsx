"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { TimeCapsule, CapsuleType } from "@/types"
import { formatDate } from "@/lib/utils"
import { PhoneLoader } from "@/components/features/phone-loader"

const CAPSULE_TYPES: { id: CapsuleType; icon: string; label: string; desc: string }[] = [
  { id: "memory",      icon: "💙", label: "Recuerdo",   desc: "Momentos especiales" },
  { id: "dream",       icon: "💜", label: "Sueño",      desc: "Metas y aspiraciones" },
  { id: "love",        icon: "💕", label: "Amor",       desc: "Mensajes de corazón" },
  { id: "achievement", icon: "🏆", label: "Logro",      desc: "Éxitos personales" },
  { id: "mystery",     icon: "🔮", label: "Misterio",   desc: "Sorpresas ocultas" },
  { id: "reflection",  icon: "🤔", label: "Reflexión",  desc: "Pensamientos profundos" },
]

const DATE_PRESETS = [
  { days: 30,  icon: "📅", label: "1 Mes" },
  { days: 90,  icon: "🗓️", label: "3 Meses" },
  { days: 180, icon: "📆", label: "6 Meses" },
  { days: 365, icon: "🎂", label: "1 Año" },
]

interface Props { onBack: () => void }

type View = "list" | "create" | "read"

export function TimeCapsuleApp({ onBack }: Props) {
  const [view, setView] = useState<View>("list")
  const [capsules, setCapsules] = useState<TimeCapsule[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TimeCapsule | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [message, setMessage] = useState("")
  const [capsuleType, setCapsuleType] = useState<CapsuleType>("memory")
  const [unlockDays, setUnlockDays] = useState(30)
  const [customDate, setCustomDate] = useState("")
  const [useCustom, setUseCustom] = useState(false)

  useEffect(() => {
    loadCapsules()
  }, [])

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
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!message.trim()) { toast.error("Escribe un mensaje"); return }
    const unlock_date = useCustom && customDate
      ? customDate
      : new Date(Date.now() + unlockDays * 86_400_000).toISOString().split("T")[0]
    setSaving(true)
    try {
      await authFetch("/api/capsules", {
        method: "POST",
        body: JSON.stringify({ message: message.trim(), type: capsuleType, unlock_date }),
      })
      toast.success("Cápsula creada 💎")
      setMessage("")
      setView("list")
      loadCapsules()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  async function handleOpen(capsule: TimeCapsule) {
    if (capsule.is_opened) { setSelected(capsule); setView("read"); return }
    if (!confirm("¿Abrir esta cápsula ahora?")) return
    try {
      await authFetch(`/api/capsules/${capsule.id}/open`, { method: "PATCH" })
      await loadCapsules()
      const updated = { ...capsule, is_opened: true }
      setSelected(updated)
      setView("read")
      toast.success("¡Cápsula abierta! ✨")
    } catch { toast.error("Error al abrir") }
  }

  const nowDate = new Date()
  const now = `${nowDate.getFullYear()}-${String(nowDate.getMonth()+1).padStart(2,"0")}-${String(nowDate.getDate()).padStart(2,"0")}`

  function daysUntil(dateStr: string): number {
    const unlock = new Date(dateStr + "T00:00:00")
    const today = new Date(now + "T00:00:00")
    return Math.ceil((unlock.getTime() - today.getTime()) / 86_400_000)
  }

  if (view === "read" && selected) {
    const t = CAPSULE_TYPES.find((t) => t.id === selected.type)
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span>💎 Cápsula Abierta</span>
        </div>
        <div className="app-content-body" style={{ alignItems: "center", textAlign: "center" }}>
          <span style={{ fontSize: "3rem" }}>{t?.icon ?? "💎"}</span>
          <h3 style={{ fontWeight: 700, color: "var(--foreground)" }}>{t?.label}</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
            Creada el {formatDate(selected.created_at)}
          </p>
          <div
            style={{
              background: "var(--muted)",
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem",
              textAlign: "left",
              width: "100%",
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "var(--foreground)",
              whiteSpace: "pre-wrap",
            }}
          >
            {selected.message}
          </div>
        </div>
      </>
    )
  }

  if (view === "create") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span>✨ Nueva Cápsula</span>
        </div>
        <div className="app-content-body">
          <div className="form-group">
            <label className="form-label">Tu Mensaje 💌</label>
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
                  <span style={{ fontSize: "1.125rem" }}>{t.icon}</span>
                  <span style={{ fontSize: "0.625rem", fontWeight: 600, color: capsuleType === t.id ? "var(--primary)" : "var(--foreground-light)" }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de Apertura 📅</label>
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
                  {p.icon} {p.label}
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
              <input
                type="date"
                className="input"
                style={{ marginTop: "0.5rem" }}
                value={customDate}
                min={now}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            )}
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "✨ Crear Cápsula"}
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
        <span>💎 Cápsulas del Tiempo</span>
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

        {loading ? (
          <PhoneLoader />
        ) : capsules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <div className="animate-bounce-slow" style={{ fontSize: "2.25rem" }}>⏳</div>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>
              Sin cápsulas aún
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
              Guarda un mensaje para el futuro 💌
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {capsules.map((c) => {
              const t = CAPSULE_TYPES.find((t) => t.id === c.type)
              const canOpen = c.unlock_date <= now
              return (
                <button
                  key={c.id}
                  onClick={() => handleOpen(c)}
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
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    opacity: c.is_opened ? 0.65 : 1,
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "1.75rem" }}>{c.is_opened ? "📭" : canOpen ? "📬" : "🔒"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>
                      {t?.icon} {t?.label}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: canOpen && !c.is_opened ? "var(--primary)" : "var(--foreground-muted)", fontWeight: canOpen && !c.is_opened ? 700 : 400 }}>
                      {c.is_opened
                        ? `Abierta el ${formatDate(c.unlock_date)}`
                        : canOpen
                        ? "¡Lista para abrir! ✨"
                        : `Se abre en ${daysUntil(c.unlock_date)} día${daysUntil(c.unlock_date) !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                  {canOpen && !c.is_opened && (
                    <span style={{ fontSize: "1.25rem" }}>💝</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <button className="btn btn-primary" onClick={() => setView("create")}>
          ✨ Crear Cápsula
        </button>
      </div>
    </>
  )
}
