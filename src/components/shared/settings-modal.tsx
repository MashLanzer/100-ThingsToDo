"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { useCoupleStatus, useLinkPartner, useUnlinkPartner } from "@/hooks/use-couple"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { X, Copy, Check } from "lucide-react"

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

function saveThemeSettings(patch: Partial<{ themeId: string; fontSize: string }>) {
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

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsModal() {
  const { showSettingsModal, closeSettingsModal } = useAppStore()
  const { data, isLoading } = useCoupleStatus()
  const { user } = useAuth()
  const linkMutation = useLinkPartner()
  const unlinkMutation = useUnlinkPartner()
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [currentTheme, setCurrentTheme] = useState("purple")
  const [currentFont, setCurrentFont] = useState<"normal" | "large">("normal")
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"perfil" | "ajustes">("perfil")

  // App settings state
  const [coupleName, setCoupleName] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [privateJournal, setPrivateJournal] = useState(false)
  const [weekStartsMonday, setWeekStartsMonday] = useState(false)
  const [hiddenApps, setHiddenApps] = useState<string[]>([])

  useEffect(() => {
    if (showSettingsModal) {
      const s = readThemeSettings()
      setCurrentTheme(s.themeId ?? "purple")
      setCurrentFont(s.fontSize ?? "normal")

      const as = readAppSettings()
      setCoupleName(as.coupleName ?? "")
      setSoundEnabled(as.soundEnabled ?? true)
      setVibrationEnabled(as.vibrationEnabled ?? true)
      setPrivateJournal(as.privateJournal ?? false)
      setWeekStartsMonday(as.weekStartsMonday ?? false)
      setHiddenApps(as.hiddenApps ?? [])
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
    if (!confirm("¿Seguro que quieres desvincular a tu pareja?")) return
    try {
      await unlinkMutation.mutateAsync()
      toast.success("Pareja desvinculada")
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error al desvincular") }
  }

  function handleCoupleNameChange(v: string) {
    setCoupleName(v)
    saveAppSettings({ coupleName: v })
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

  return (
    <div className="modal-overlay-bg" onClick={closeSettingsModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚙️ Configuración</h2>
          <button className="btn-icon" onClick={closeSettingsModal}><X size={18} /></button>
        </div>

        {/* Pill tabs */}
        <div className="pill-tab-container" style={{ margin: "0 1.25rem 0.75rem" }}>
          <button
            className={`pill-tab-btn${activeTab === "perfil" ? " active" : ""}`}
            onClick={() => setActiveTab("perfil")}
          >
            👤 Perfil
          </button>
          <button
            className={`pill-tab-btn${activeTab === "ajustes" ? " active" : ""}`}
            onClick={() => setActiveTab("ajustes")}
          >
            ⚙️ Ajustes
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
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
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
                    {data?.couple ? `💕 ${data.partner?.name ?? "Vinculado"}` : "Sin pareja"}
                  </div>
                </div>
              )}

              {/* ── Couple management ── */}
              <section>
                <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.75rem" }}>
                  💕 Gestionar Pareja
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

              {/* ── Sonidos ── */}
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>🔔 Sonidos</p>
                  </div>
                  <Toggle checked={soundEnabled} onChange={handleSoundToggle} />
                </div>
              </section>

              {/* ── Vibración ── */}
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>📳 Vibración al completar tarea</p>
                  </div>
                  <Toggle checked={vibrationEnabled} onChange={handleVibrationToggle} />
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
