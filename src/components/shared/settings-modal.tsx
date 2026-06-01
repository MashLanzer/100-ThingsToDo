"use client"

import { useState, useEffect } from "react"
import { signOut } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { useCoupleStatus, useLinkPartner, useUnlinkPartner } from "@/hooks/use-couple"
import { useAuth } from "@/hooks/use-auth"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { toast } from "sonner"
import { X, Copy, Check, User, Settings2, Heart, Moon, Bell, Vibrate, Lock, Upload, LogOut } from "lucide-react"
import { showConfirm } from "@/lib/confirm"

const THEMES = [
  { id: "purple",   name: "Morado",   primary: "#8B5CF6", lighter: "#EDE9FE", border: "#F3E8FF", muted: "#F5F3FF" },
  { id: "pink",     name: "Rosa",     primary: "#EC4899", lighter: "#FCE7F3", border: "#FDE7F3", muted: "#FDF2F8" },
  { id: "blue",     name: "Azul",     primary: "#3B82F6", lighter: "#DBEAFE", border: "#EFF6FF", muted: "#EFF6FF" },
  { id: "green",    name: "Verde",    primary: "#10B981", lighter: "#D1FAE5", border: "#ECFDF5", muted: "#ECFDF5" },
  { id: "orange",   name: "Naranja",  primary: "#F97316", lighter: "#FFF7ED", border: "#FEF3C7", muted: "#FFF7ED" },
  { id: "lavender", name: "Lavanda",  primary: "#A78BFA", lighter: "#F5F3FF", border: "#EDE9FE", muted: "#F5F3FF" },
]

const APP_TOGGLES = [
  { id: "journal",  name: "Diario" },
  { id: "music",    name: "Música" },
  { id: "desafios", name: "Desafíos" },
  { id: "map",      name: "Aventuras" },
  { id: "capsule",  name: "Cápsulas" },
  { id: "goals",    name: "Metas" },
]

// ── Theme settings (existing key) ────────────────────────────────────────────

function readThemeSettings() {
  try {
    const raw = localStorage.getItem("ttd_theme_v1")
    return raw ? JSON.parse(raw) : { themeId: "purple", fontSize: "normal" }
  } catch { return { themeId: "purple", fontSize: "normal" } }
}

function saveThemeSettings(patch: Partial<{ themeId: string; fontSize: string; darkMode: boolean }>) {
  try {
    const current = readThemeSettings()
    localStorage.setItem("ttd_theme_v1", JSON.stringify({ ...current, ...patch }))
  } catch { /* */ }
}

// ── App settings (new key) ────────────────────────────────────────────────────

interface AppSettings {
  coupleName: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  privateJournal: boolean
  weekStartsMonday: boolean
  hiddenApps: string[]
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  coupleName: "",
  soundEnabled: true,
  vibrationEnabled: true,
  privateJournal: false,
  weekStartsMonday: false,
  hiddenApps: [],
}

export function readAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("ttd_settings_v1")
    if (!raw) return { ...DEFAULT_APP_SETTINGS }
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) }
  } catch { return { ...DEFAULT_APP_SETTINGS } }
}

export function saveAppSettings(patch: Partial<AppSettings>) {
  try {
    const current = readAppSettings()
    localStorage.setItem("ttd_settings_v1", JSON.stringify({ ...current, ...patch }))
  } catch { /* */ }
}

// ── Theme helpers ─────────────────────────────────────────────────────────────

function applyTheme(t: typeof THEMES[0]) {
  const root = document.documentElement
  root.style.setProperty("--primary", t.primary)
  root.style.setProperty("--primary-lighter", t.lighter)
  root.style.setProperty("--border", t.border)
  root.style.setProperty("--muted", t.muted)
  saveThemeSettings({ themeId: t.id })
}

function applyFontSize(size: "normal" | "large") {
  document.documentElement.style.fontSize = size === "large" ? "17px" : "15px"
  saveThemeSettings({ fontSize: size })
}

// ── Avatar gradient helper ────────────────────────────────────────────────────

function getAvatarGradient(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const gradients = [
    "linear-gradient(135deg, #8B5CF6, #EC4899)",
    "linear-gradient(135deg, #06B6D4, #10B981)",
    "linear-gradient(135deg, #F59E0B, #EF4444)",
    "linear-gradient(135deg, #EC4899, #A78BFA)",
    "linear-gradient(135deg, #10B981, #3B82F6)",
    "linear-gradient(135deg, #3B82F6, #8B5CF6)",
    "linear-gradient(135deg, #A78BFA, #F59E0B)",
  ]
  return gradients[Math.abs(hash) % gradients.length]
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: "none",
        background: checked ? "var(--primary)" : "var(--border)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "white",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  )
}

// ── PIN constants ─────────────────────────────────────────────────────────────
const PIN_KEY = "ttd_journal_pin_v1"

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsModal() {
  const router = useRouter()
  const { showSettingsModal, closeSettingsModal, setCoupleName: setStoreCoupleName } = useAppStore()
  const { data, isLoading } = useCoupleStatus()
  const { user } = useAuth()
  const linkMutation = useLinkPartner()
  const unlinkMutation = useUnlinkPartner()
  const [loggingOut, setLoggingOut] = useState(false)
  const { subscribe: subscribePush, subscribing: pushSubscribing, isSubscribed: pushSubscribed } = usePushNotifications()
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [currentTheme, setCurrentTheme] = useState("purple")
  const [currentFont, setCurrentFont] = useState<"normal" | "large">("normal")
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"perfil" | "ajustes">("perfil")

  const [darkMode, setDarkMode] = useState(false)

  // App settings state
  const [coupleName, setCoupleName] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [privateJournal, setPrivateJournal] = useState(false)
  const [weekStartsMonday, setWeekStartsMonday] = useState(false)
  const [hiddenApps, setHiddenApps] = useState<string[]>([])

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pinSection, setPinSection] = useState<"idle" | "setup1" | "setup2" | "disable">("idle")
  const [pinNew, setPinNew] = useState("")
  const [pinConfirm, setPinConfirm] = useState("")
  const [pinDisable, setPinDisable] = useState("")
  const [pinError, setPinError] = useState("")

  useEffect(() => {
    if (showSettingsModal) {
      const s = readThemeSettings()
      setCurrentTheme(s.themeId ?? "purple")
      setCurrentFont(s.fontSize ?? "normal")
      setDarkMode(s.darkMode ?? false)
      if (s.darkMode) document.documentElement.setAttribute("data-dark", "true")
      else document.documentElement.removeAttribute("data-dark")

      const as = readAppSettings()
      setCoupleName(as.coupleName ?? "")
      setSoundEnabled(as.soundEnabled ?? true)
      setVibrationEnabled(as.vibrationEnabled ?? true)
      setPrivateJournal(as.privateJournal ?? false)
      setWeekStartsMonday(as.weekStartsMonday ?? false)
      setHiddenApps(as.hiddenApps ?? [])

      // Load PIN state
      try {
        const stored = localStorage.getItem(PIN_KEY)
        setPinEnabled(!!stored)
      } catch { setPinEnabled(false) }
      setPinSection("idle")
      setPinNew("")
      setPinConfirm("")
      setPinDisable("")
      setPinError("")
    }
  }, [showSettingsModal])

  if (!showSettingsModal) return null

  function handleTheme(t: typeof THEMES[0]) {
    applyTheme(t)
    setCurrentTheme(t.id)
  }

  function handleFont(size: "normal" | "large") {
    applyFontSize(size)
    setCurrentFont(size)
  }

  async function handleCopy() {
    if (!data?.user.couple_code) return
    await navigator.clipboard.writeText(data.user.couple_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLink() {
    if (code.trim().length !== 6) { toast.error("El código debe tener 6 caracteres"); return }
    try {
      await linkMutation.mutateAsync(code.trim().toUpperCase())
      toast.success("¡Pareja vinculada exitosamente! 💕")
      setCode("")
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error al vincular") }
  }

  async function handleUnlink() {
    if (!await showConfirm({ title: "Desvincular pareja", message: "¿Seguro que quieres desvincular a tu pareja?", danger: true, confirmLabel: "Desvincular" })) return
    try {
      await unlinkMutation.mutateAsync()
      toast.success("Pareja desvinculada")
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error al desvincular") }
  }

  function handleCoupleNameChange(v: string) {
    setCoupleName(v)
    saveAppSettings({ coupleName: v })
    setStoreCoupleName(v.trim() || "ThingsToDo")
  }

  function handleSoundToggle(v: boolean) {
    setSoundEnabled(v)
    saveAppSettings({ soundEnabled: v })
  }

  function handleVibrationToggle(v: boolean) {
    setVibrationEnabled(v)
    saveAppSettings({ vibrationEnabled: v })
  }

  function handlePrivateJournalToggle(v: boolean) {
    setPrivateJournal(v)
    saveAppSettings({ privateJournal: v })
  }

  function handleWeekStarts(monday: boolean) {
    setWeekStartsMonday(monday)
    saveAppSettings({ weekStartsMonday: monday })
  }

  function handleHiddenApp(appId: string, hidden: boolean) {
    const updated = hidden
      ? [...hiddenApps, appId]
      : hiddenApps.filter((id) => id !== appId)
    setHiddenApps(updated)
    saveAppSettings({ hiddenApps: updated })
  }

  function handleDarkMode(v: boolean) {
    setDarkMode(v)
    const ts = readThemeSettings()
    saveThemeSettings({ ...ts, darkMode: v })
    if (v) document.documentElement.setAttribute("data-dark", "true")
    else document.documentElement.removeAttribute("data-dark")
  }

  async function handleLogout() {
    if (!await showConfirm({ title: "Cerrar sesión", message: "¿Seguro que quieres salir de la app?", danger: false, confirmLabel: "Cerrar sesión" })) return
    setLoggingOut(true)
    try {
      await signOut(getFirebaseAuth())
      closeSettingsModal()
      router.replace("/login")
    } catch {
      toast.error("Error al cerrar sesión")
      setLoggingOut(false)
    }
  }

  async function handleEnablePush() {
    await subscribePush()
    if (Notification.permission === "denied") {
      toast.error("Notificaciones bloqueadas en tu navegador")
    } else {
      toast.success("¡Notificaciones activadas! 🔔")
    }
  }

  // ── PIN handlers ──────────────────────────────────────────────────────────

  function handlePinToggle(enable: boolean) {
    setPinError("")
    if (enable) {
      // Start setup flow
      setPinSection("setup1")
      setPinNew("")
      setPinConfirm("")
    } else {
      // Start disable flow
      setPinSection("disable")
      setPinDisable("")
    }
  }

  function handlePinSetup1Submit() {
    if (!/^\d{4}$/.test(pinNew)) {
      setPinError("El PIN debe tener exactamente 4 dígitos")
      return
    }
    setPinError("")
    setPinSection("setup2")
    setPinConfirm("")
  }

  function handlePinSetup2Submit() {
    if (pinConfirm !== pinNew) {
      setPinError("Los PINs no coinciden. Intenta de nuevo")
      setPinSection("setup1")
      setPinNew("")
      setPinConfirm("")
      return
    }
    try {
      localStorage.setItem(PIN_KEY, pinNew)
      setPinEnabled(true)
      setPinSection("idle")
      setPinNew("")
      setPinConfirm("")
      setPinError("")
      toast.success("PIN activado 🔐")
    } catch {
      setPinError("Error al guardar el PIN")
    }
  }

  function handlePinDisableSubmit() {
    try {
      const stored = localStorage.getItem(PIN_KEY)
      if (pinDisable !== stored) {
        setPinError("PIN incorrecto")
        setPinDisable("")
        return
      }
      localStorage.removeItem(PIN_KEY)
      setPinEnabled(false)
      setPinSection("idle")
      setPinDisable("")
      setPinError("")
      toast.success("PIN desactivado")
    } catch {
      setPinError("Error al desactivar el PIN")
    }
  }

  function cancelPinSection() {
    setPinSection("idle")
    setPinNew("")
    setPinConfirm("")
    setPinDisable("")
    setPinError("")
  }

  async function getAuthToken() {
    const { getFirebaseAuth } = await import("@/lib/firebase/client")
    return getFirebaseAuth().currentUser?.getIdToken()
  }

  async function handleExportPlans() {
    try {
      const token = await getAuthToken()
      if (!token) { toast.error("No autenticado"); return }
      const res = await fetch("/api/plans", { headers: { Authorization: `Bearer ${token}` } })
      const plans = await res.json()
      let text = "# Planes y Tareas\n\n"
      for (const plan of (plans ?? [])) {
        text += `## ${plan.title}\n`
        if (plan.description) text += `${plan.description}\n`
        text += `Progreso: ${plan.completed_count ?? 0}/${plan.task_count ?? 0} tareas\n\n`
      }
      downloadText(text, "planes-thingstodo.txt")
    } catch { toast.error("Error al exportar") }
  }

  async function handleExportJournal() {
    try {
      const token = await getAuthToken()
      if (!token) { toast.error("No autenticado"); return }
      const res = await fetch("/api/journal", { headers: { Authorization: `Bearer ${token}` } })
      const entries = await res.json()
      let text = "# Diario de Pareja\n\n"
      for (const entry of (Array.isArray(entries) ? entries : (entries.entries ?? []))) {
        text += `## ${entry.date}\n`
        if (entry.mood) text += `Estado de ánimo: ${entry.mood}\n`
        text += `${entry.content}\n\n---\n\n`
      }
      downloadText(text, "diario-thingstodo.txt")
    } catch { toast.error("Error al exportar") }
  }

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    toast.success("¡Descargado! ✨")
  }

  return (
    <div className="modal-overlay-bg" onClick={closeSettingsModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><Settings2 size={18} /> Configuración</h2>
          <button className="modal-close-btn" onClick={closeSettingsModal}><X size={14} /></button>
        </div>

        {/* Pill tabs */}
        <div className="pill-tab-container" style={{ margin: "0 1.25rem 0.75rem" }}>
          <button
            className={`pill-tab-btn${activeTab === "perfil" ? " active" : ""}`}
            onClick={() => setActiveTab("perfil")}
          >
            <User size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Perfil
          </button>
          <button
            className={`pill-tab-btn${activeTab === "ajustes" ? " active" : ""}`}
            onClick={() => setActiveTab("ajustes")}
          >
            <Settings2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Ajustes
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {activeTab === "perfil" && (
            <>
              {/* ── User header ── */}
              {user && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  background: "linear-gradient(135deg, var(--primary-lighter) 0%, var(--muted) 100%)",
                  borderRadius: "var(--radius-lg)", padding: "0.875rem",
                }}>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid var(--primary-light)", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: getAvatarGradient(user.displayName ?? user.email ?? "?"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 700, fontSize: "1.125rem",
                      fontFamily: "'Fredoka', sans-serif",
                    }}>
                      {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.displayName ?? "Mi cuenta"}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </p>
                  </div>
                  <div style={{
                    fontSize: "0.625rem", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", flexShrink: 0,
                    background: data?.couple ? "#d1fae5" : "var(--muted)",
                    color: data?.couple ? "#065f46" : "var(--foreground-muted)",
                    border: data?.couple ? "1px solid #6ee7b7" : "1px solid var(--border)",
                  }}>
                    {data?.couple ? <><Heart size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{data.partner?.name ?? "Vinculado"}</> : "Sin pareja"}
                  </div>
                </div>
              )}

              {/* ── Couple management ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.75rem" }}>
                  <Heart size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Gestionar Pareja
                </h3>

                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "1.5rem" }}>
                    <svg className="animate-heartbeat" width="36" height="36" viewBox="0 0 24 24" fill="#8B5CF6">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                ) : data?.couple ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💏</div>
                    <p style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                      Vinculado con
                    </p>
                    <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>
                      {data.partner?.name ?? "Tu pareja"}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "1.25rem" }}>
                      {data.partner?.email}
                    </p>
                    <div style={{ background: "var(--mint)", borderRadius: "var(--radius-md)", padding: "0.625rem", marginBottom: "1.25rem", fontSize: "0.8125rem", color: "#065F46" }}>
                      ✨ ¡Compartiendo planes juntos!
                    </div>
                    <button className="btn btn-outline btn-danger" onClick={handleUnlink} disabled={unlinkMutation.isPending}>
                      {unlinkMutation.isPending ? "Desvinculando..." : "Desvincular Pareja"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem", fontSize: "0.9375rem" }}>Tu Código Único</p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "0.75rem" }}>
                        Comparte este código con tu pareja
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span className="couple-code">{data?.user.couple_code ?? "------"}</span>
                        <button className="btn-icon-small" onClick={handleCopy} title="Copiar">
                          {copied ? <Check size={16} color="var(--success-dark)" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--foreground-muted)" }}>
                      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                      <span style={{ fontSize: "0.8125rem" }}>o</span>
                      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem", fontSize: "0.9375rem" }}>Vincular con Pareja</p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "0.75rem" }}>
                        Ingresa el código de tu pareja
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text" className="input" placeholder="Ej: AB12CD" maxLength={6}
                          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                          style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}
                        />
                        <button className="btn btn-primary" onClick={handleLink}
                          disabled={linkMutation.isPending || code.length !== 6} style={{ flexShrink: 0 }}>
                          {linkMutation.isPending ? "..." : "Vincular"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

            </>
          )}

          {activeTab === "ajustes" && (
            <>
              {/* ── Color theme ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.625rem" }}>
                  🎨 Color del tema
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
                  {THEMES.map((t) => {
                    const selected = currentTheme === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTheme(t)}
                        onMouseEnter={() => setHoveredTheme(t.id)}
                        onMouseLeave={() => setHoveredTheme(null)}
                        onTouchStart={() => setHoveredTheme(t.id)}
                        onTouchEnd={() => setHoveredTheme(null)}
                        title={t.name}
                        style={{
                          aspectRatio: "1", borderRadius: "12px",
                          backgroundColor: t.primary,
                          border: "none",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: selected
                            ? `0 0 0 3px white, 0 0 0 5px ${t.primary}`
                            : hoveredTheme === t.id
                            ? `0 0 0 2px white, 0 0 0 4px ${t.primary}88`
                            : "none",
                          transform: hoveredTheme === t.id ? "scale(1.12)" : "scale(1)",
                          fontSize: "0.9rem",
                          transition: "box-shadow 0.15s, transform 0.15s",
                        }}
                      >
                        {selected && <span style={{ color: "white", fontWeight: 900, fontSize: "1rem", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "0.375rem" }}>
                  {THEMES.find((t) => t.id === (hoveredTheme ?? currentTheme))?.name ?? ""}
                </p>
              </section>

              {/* ── Font size ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.625rem" }}>
                  🔤 Tamaño de texto
                </h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {(["normal", "large"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFont(size)}
                      style={{
                        flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)",
                        border: currentFont === size ? "2px solid var(--primary)" : "2px solid var(--border)",
                        background: currentFont === size ? "var(--primary-lighter)" : "white",
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: size === "large" ? "0.9375rem" : "0.8125rem",
                        fontWeight: 600,
                        color: currentFont === size ? "var(--primary)" : "var(--foreground-light)",
                      }}
                    >
                      {size === "normal" ? "Normal" : "Grande"}
                    </button>
                  ))}
                </div>
              </section>

              <div style={{ height: "1px", background: "var(--border)" }} />

              {/* ── Custom app name ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.625rem" }}>
                  Nombre de vuestra app 💕
                </h3>
                <input
                  className="input"
                  placeholder="Ej: Luna y Sol 🌙"
                  value={coupleName}
                  onChange={(e) => handleCoupleNameChange(e.target.value)}
                  maxLength={40}
                />
              </section>

              {/* ── Modo oscuro ── */}
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4 }}><Moon size={14} /> Modo Oscuro</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Cambia a fondo oscuro</p>
                  </div>
                  <Toggle checked={darkMode} onChange={handleDarkMode} />
                </div>
              </section>

              {/* ── Sonidos ── */}
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4 }}><Bell size={14} /> Sonidos</p>
                  </div>
                  <Toggle checked={soundEnabled} onChange={handleSoundToggle} />
                </div>
              </section>

              {/* ── Vibración ── */}
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4 }}><Vibrate size={14} /> Vibración al completar tarea</p>
                  </div>
                  <Toggle checked={vibrationEnabled} onChange={handleVibrationToggle} />
                </div>
              </section>

              {/* ── Notificaciones push ── */}
              <section>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>
                      🔔 Notificaciones push
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>
                      {pushSubscribed
                        ? "Activadas ✅"
                        : "Desactivadas"}
                    </p>
                    <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "0.25rem" }}>
                      Recibirás una notificación cuando tu pareja complete una tarea 💕
                    </p>
                  </div>
                  {!pushSubscribed && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", flexShrink: 0 }}
                      onClick={handleEnablePush}
                      disabled={pushSubscribing}
                    >
                      {pushSubscribing ? "..." : "Activar"}
                    </button>
                  )}
                </div>
              </section>

              {/* ── Modo privado del diario ── */}
              <section>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>🔒 Modo privado del diario</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>
                      Ocultar entrada del partner hasta que tú escribas la tuya
                    </p>
                  </div>
                  <Toggle checked={privateJournal} onChange={handlePrivateJournalToggle} />
                </div>
              </section>

              {/* ── PIN del diario ── */}
              <section>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4 }}><Lock size={14} /> PIN del diario</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>
                      {pinEnabled ? "Activo — el diario se bloquea al abrirlo" : "Protege el diario con un PIN de 4 dígitos"}
                    </p>
                  </div>
                  <Toggle checked={pinEnabled} onChange={handlePinToggle} />
                </div>

                {/* Inline expand for setup / disable */}
                {pinSection !== "idle" && (
                  <div style={{
                    marginTop: "0.75rem",
                    background: "var(--muted)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.875rem",
                    display: "flex", flexDirection: "column", gap: "0.5rem",
                  }}>
                    {pinSection === "setup1" && (
                      <>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)" }}>
                          Nuevo PIN (4 dígitos)
                        </p>
                        <input
                          className="input"
                          type="tel"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="••••"
                          value={pinNew}
                          onChange={e => setPinNew(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.25rem" }}
                          autoFocus
                        />
                        {pinError && <p style={{ fontSize: "0.75rem", color: "#ef4444" }}>{pinError}</p>}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-primary" style={{ flex: 1, fontSize: "0.8125rem" }}
                            onClick={handlePinSetup1Submit} disabled={pinNew.length !== 4}>
                            Continuar
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: "0.8125rem" }} onClick={cancelPinSection}>
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}

                    {pinSection === "setup2" && (
                      <>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)" }}>
                          Confirma el PIN
                        </p>
                        <input
                          className="input"
                          type="tel"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="••••"
                          value={pinConfirm}
                          onChange={e => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.25rem" }}
                          autoFocus
                        />
                        {pinError && <p style={{ fontSize: "0.75rem", color: "#ef4444" }}>{pinError}</p>}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-primary" style={{ flex: 1, fontSize: "0.8125rem" }}
                            onClick={handlePinSetup2Submit} disabled={pinConfirm.length !== 4}>
                            Activar PIN 🔐
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: "0.8125rem" }} onClick={cancelPinSection}>
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}

                    {pinSection === "disable" && (
                      <>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)" }}>
                          Ingresa tu PIN actual para desactivarlo
                        </p>
                        <input
                          className="input"
                          type="tel"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="••••"
                          value={pinDisable}
                          onChange={e => setPinDisable(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.25rem" }}
                          autoFocus
                        />
                        {pinError && <p style={{ fontSize: "0.75rem", color: "#ef4444" }}>{pinError}</p>}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-outline btn-danger" style={{ flex: 1, fontSize: "0.8125rem" }}
                            onClick={handlePinDisableSubmit} disabled={pinDisable.length !== 4}>
                            Desactivar
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: "0.8125rem" }} onClick={cancelPinSection}>
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* ── Primer día de semana ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.625rem" }}>
                  📅 Primer día de semana
                </h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {([{ label: "Dom", monday: false }, { label: "Lun", monday: true }] as const).map(({ label, monday }) => (
                    <button
                      key={label}
                      onClick={() => handleWeekStarts(monday)}
                      style={{
                        flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)",
                        border: weekStartsMonday === monday ? "2px solid var(--primary)" : "2px solid var(--border)",
                        background: weekStartsMonday === monday ? "var(--primary-lighter)" : "white",
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: weekStartsMonday === monday ? "var(--primary)" : "var(--foreground-light)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Apps del teléfono ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.625rem" }}>
                  📱 Apps del teléfono
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {APP_TOGGLES.map((app) => (
                    <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{app.name}</p>
                      <Toggle
                        checked={!hiddenApps.includes(app.id)}
                        onChange={(v) => handleHiddenApp(app.id, !v)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Exportar datos ── */}
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.625rem", display: "flex", alignItems: "center", gap: 4 }}><Upload size={14} /> Exportar datos</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: "0.8125rem", justifyContent: "flex-start" }}
                    onClick={handleExportPlans}
                  >
                    📋 Exportar planes y tareas
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: "0.8125rem", justifyContent: "flex-start" }}
                    onClick={handleExportJournal}
                  >
                    📓 Exportar diario
                  </button>
                </div>
              </div>

              {/* ── Cerrar sesión ── */}
              <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                <button
                  className="btn btn-outline btn-danger"
                  style={{ width: "100%", justifyContent: "center", gap: "0.5rem" }}
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut size={15} />
                  {loggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
            ThingsToDo Kawaii Edition — Hecho con 💕 por MashLanzer
          </span>
        </div>
      </div>
    </div>
  )
}
