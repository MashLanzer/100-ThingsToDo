"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { useCoupleStatus, useLinkPartner, useUnlinkPartner } from "@/hooks/use-couple"
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

function readSettings() {
  try {
    const raw = localStorage.getItem("ttd_theme_v1")
    return raw ? JSON.parse(raw) : { themeId: "purple", fontSize: "normal" }
  } catch { return { themeId: "purple", fontSize: "normal" } }
}

function saveSettings(patch: Partial<{ themeId: string; fontSize: string }>) {
  try {
    const current = readSettings()
    localStorage.setItem("ttd_theme_v1", JSON.stringify({ ...current, ...patch }))
  } catch { /* */ }
}

function applyTheme(t: typeof THEMES[0]) {
  const root = document.documentElement
  root.style.setProperty("--primary", t.primary)
  root.style.setProperty("--primary-lighter", t.lighter)
  root.style.setProperty("--border", t.border)
  root.style.setProperty("--muted", t.muted)
  saveSettings({ themeId: t.id })
}

function applyFontSize(size: "normal" | "large") {
  document.documentElement.style.fontSize = size === "large" ? "17px" : "15px"
  saveSettings({ fontSize: size })
}

export function SettingsModal() {
  const { showSettingsModal, closeSettingsModal } = useAppStore()
  const { data, isLoading } = useCoupleStatus()
  const linkMutation = useLinkPartner()
  const unlinkMutation = useUnlinkPartner()
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [currentTheme, setCurrentTheme] = useState("purple")
  const [currentFont, setCurrentFont] = useState<"normal" | "large">("normal")

  useEffect(() => {
    if (showSettingsModal) {
      const s = readSettings()
      setCurrentTheme(s.themeId ?? "purple")
      setCurrentFont(s.fontSize ?? "normal")
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

  return (
    <div className="modal-overlay-bg" onClick={closeSettingsModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚙️ Configuración</h2>
          <button className="btn-icon" onClick={closeSettingsModal}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

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
                    title={t.name}
                    style={{
                      aspectRatio: "1", borderRadius: "10px",
                      background: t.primary, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${t.primary}` : "none",
                      fontSize: "0.9rem",
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    {selected && <span style={{ color: "white", fontWeight: 900, fontSize: "1rem" }}>✓</span>}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "0.375rem" }}>
              {THEMES.find((t) => t.id === currentTheme)?.name ?? ""}
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

          {/* ── Divider ── */}
          <div style={{ height: "1px", background: "var(--border)" }} />

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
