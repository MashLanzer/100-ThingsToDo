"use client"

import { useState, useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Favor, FavorDifficulty, FavorCategory } from "@/types"
import { RefreshCw, ChevronLeft } from "lucide-react"
import { useDarkMode } from "@/hooks/use-dark-mode"

const DIFFICULTIES: { id: FavorDifficulty; label: string; pts: number; emoji: string; color: string; bg: string }[] = [
  { id: "easy",   label: "Fácil",   pts: 10, emoji: "⭐",     color: "#059669", bg: "#d1fae5" },
  { id: "medium", label: "Medio",   pts: 25, emoji: "⭐⭐",   color: "#d97706", bg: "#fef3c7" },
  { id: "hard",   label: "Difícil", pts: 50, emoji: "⭐⭐⭐", color: "#dc2626", bg: "#fee2e2" },
]

const CATEGORIES: { id: FavorCategory; label: string; color: string; bg: string }[] = [
  { id: "romantic", label: "💕 Romántico", color: "#be185d", bg: "#fdf2f8" },
  { id: "fun",      label: "🎉 Divertido", color: "#d97706", bg: "#fffbeb" },
  { id: "help",     label: "🤝 Ayuda",     color: "#0369a1", bg: "#eff6ff" },
  { id: "surprise", label: "🎁 Sorpresa",  color: "#7c3aed", bg: "#f5f3ff" },
]

const CAT_COLORS: Record<FavorCategory, { color: string; bg: string; border: string }> = {
  romantic: { color: "#be185d", bg: "#fdf2f8", border: "#f9a8d4" },
  fun:      { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  help:     { color: "#0369a1", bg: "#eff6ff", border: "#93c5fd" },
  surprise: { color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
}

const FAVOR_CSS = `
@keyframes favorCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes completePop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
`

interface Props { onBack: () => void }

export function FavorsApp({ onBack }: Props) {
  const [tab, setTab] = useState<"active" | "completed" | "create">("active")
  const [favors, setFavors] = useState<Favor[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [difficulty, setDifficulty] = useState<FavorDifficulty>("medium")
  const [category, setCategory] = useState<FavorCategory>("romantic")
  const [saving, setSaving] = useState(false)

  const isDark = useDarkMode()
  const T = {
    bg:        isDark ? "#1a1225"  : "var(--background)",
    surface:   isDark ? "#221833"  : "var(--surface)",
    border:    isDark ? "#4a3465" : "var(--border)",
    text:      isDark ? "#f0e8ff" : "var(--foreground)",
    textSub:   isDark ? "#c4b8d8" : "var(--foreground-light)",
    textMuted: isDark ? "#9080a8" : "var(--foreground-muted)",
    muted:     isDark ? "#2a1e3a" : "var(--muted)",
    inputBg:   isDark ? "#2e2244" : "var(--muted)",
  }

  useEffect(() => {
    loadFavors()
    const interval = setInterval(loadFavors, 20_000)
    return () => clearInterval(interval)
  }, [])

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

  async function loadFavors() {
    setLoading(true)
    try {
      const data = await authFetch("/api/favors")
      setFavors(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error("Escribe un título"); return }
    const pts = DIFFICULTIES.find((d) => d.id === difficulty)?.pts ?? 25
    setSaving(true)
    try {
      await authFetch("/api/favors", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), description: desc.trim(), difficulty, category, points: pts }),
      })
      toast.success("Favor creado 💝")
      setTitle("")
      setDesc("")
      setTab("active")
      loadFavors()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleComplete(id: string) {
    try {
      await authFetch(`/api/favors/${id}/complete`, { method: "PATCH" })
      toast.success("¡Favor completado! 🎉")
      loadFavors()
    } catch { toast.error("Error") }
  }

  const active = favors.filter((f) => !f.is_completed)
  const completed = favors.filter((f) => f.is_completed)

  const tabConfig = [
    { id: "active" as const,    label: "Activos",  emoji: "💝", count: active.length },
    { id: "completed" as const, label: "Hechos",   emoji: "✅", count: completed.length },
    { id: "create" as const,    label: "+ Crear",  emoji: "",   count: null },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{FAVOR_CSS}</style>

      {/* Header */}
      <div style={{
        padding: "1rem 1rem 0.875rem", flexShrink: 0,
        background: "linear-gradient(135deg, #831843 0%, #be185d 50%, #db2777 100%)",
        boxShadow: "0 2px 12px rgba(190,24,93,0.3)",
      }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.5rem" }}>
          <ChevronLeft size={16} /> Inicio
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "white", margin: 0 }}>💝 Favores</h2>
            <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.6)", margin: "0.125rem 0 0" }}>Pequeños gestos, grandes sonrisas</p>
          </div>
          <button
            onClick={loadFavors}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", padding: "0.375rem", borderRadius: "50%", display: "flex", alignItems: "center" }}
          >
            <RefreshCw size={14} color="white" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {tabConfig.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "0.625rem 0.25rem", background: "none", border: "none",
              borderBottom: tab === t.id ? "2.5px solid #be185d" : "2.5px solid transparent",
              cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? "#be185d" : T.textMuted, marginBottom: "-1px",
              transition: "all 0.15s",
            }}
          >
            {t.emoji} {t.label}{t.count !== null && t.count > 0 ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.875rem", background: T.bg }}>

        {/* CREATE tab */}
        {tab === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {/* Title */}
            <div>
              <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem", display: "block" }}>Título *</label>
              <input
                placeholder="Ej: Masaje de 20 minutos..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem", display: "block" }}>Descripción</label>
              <textarea
                placeholder="Detalles del favor..."
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={200}
                style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Difficulty */}
            <div>
              <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", display: "block" }}>Dificultad & Puntos</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    style={{
                      flex: 1, padding: "0.5rem 0.25rem", borderRadius: "12px",
                      border: `2px solid ${difficulty === d.id ? d.color : T.border}`,
                      background: difficulty === d.id ? d.bg : T.surface,
                      cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700,
                      textAlign: "center", color: difficulty === d.id ? d.color : T.textMuted,
                      transition: "all 0.15s",
                      boxShadow: difficulty === d.id ? `0 2px 8px ${d.color}30` : "none",
                    }}
                  >
                    <div style={{ fontSize: "1rem" }}>{d.emoji}</div>
                    <div style={{ marginTop: "0.125rem" }}>{d.label}</div>
                    <div style={{ fontSize: "0.625rem", marginTop: "0.0625rem", opacity: 0.8 }}>{d.pts}pts</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", display: "block" }}>Categoría</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    style={{
                      padding: "0.3rem 0.75rem", borderRadius: "999px",
                      border: `2px solid ${category === c.id ? c.color : T.border}`,
                      background: category === c.id ? c.bg : T.surface,
                      cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700,
                      color: category === c.id ? c.color : T.textMuted,
                      transition: "all 0.15s",
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              style={{
                padding: "0.8125rem", borderRadius: "14px", border: "none",
                background: title.trim() && !saving ? "linear-gradient(135deg, #be185d, #db2777)" : T.muted,
                color: "white", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
                cursor: title.trim() && !saving ? "pointer" : "default",
                boxShadow: title.trim() ? "0 4px 16px rgba(190,24,93,0.35)" : "none",
                transition: "all 0.15s",
              }}
            >
              {saving ? "Creando..." : "Crear Favor 💝"}
            </button>
          </div>
        )}

        {/* ACTIVE / COMPLETED tabs */}
        {(tab === "active" || tab === "completed") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {loading ? (
              <p style={{ color: T.textMuted, fontSize: "0.8125rem", textAlign: "center", padding: "1.5rem 0" }}>Cargando...</p>
            ) : (
              (tab === "active" ? active : completed).map((f, i) => {
                const diff = DIFFICULTIES.find((d) => d.id === f.difficulty)
                const cat = CATEGORIES.find((c) => c.id === f.category)
                const catColors = CAT_COLORS[f.category as FavorCategory] ?? { color: "#be185d", bg: "#fdf2f8", border: "#f9a8d4" }
                return (
                  <div
                    key={f.id}
                    style={{
                      padding: "0.875rem",
                      background: isDark ? (f.is_completed ? T.surface : T.muted) : (f.is_completed ? "#f9fafb" : catColors.bg),
                      borderRadius: "16px",
                      border: isDark ? `1.5px solid ${T.border}` : `1.5px solid ${f.is_completed ? "#e5e7eb" : catColors.border}`,
                      borderLeft: `4px solid ${f.is_completed ? "#9ca3af" : catColors.color}`,
                      opacity: f.is_completed ? 0.75 : 1,
                      animation: `favorCardIn 0.3s ease both`,
                      animationDelay: `${i * 0.05}s`,
                      boxShadow: f.is_completed ? "none" : `0 2px 8px ${catColors.color}15`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: f.is_completed ? T.textMuted : T.text, flex: 1, margin: 0 }}>
                        {f.title}
                      </h4>
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: 700, marginLeft: "0.5rem", flexShrink: 0,
                        color: diff?.color ?? "#be185d",
                        background: isDark ? `${diff?.color ?? "#be185d"}22` : (diff?.bg ?? "#fdf2f8"),
                        borderRadius: "999px", padding: "1px 7px",
                      }}>
                        +{f.points}pts
                      </span>
                    </div>
                    {f.description && (
                      <p style={{ fontSize: "0.75rem", color: T.textSub, marginTop: "0.25rem", margin: "0.25rem 0 0" }}>
                        {f.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.625rem", color: diff?.color ?? "#9ca3af", background: isDark ? `${diff?.color ?? "#be185d"}22` : (diff?.bg ?? "#f3f4f6"), borderRadius: "999px", padding: "1px 6px", fontWeight: 600 }}>
                        {diff?.emoji} {diff?.label}
                      </span>
                      <span style={{ fontSize: "0.625rem", color: catColors.color, background: isDark ? `${catColors.color}22` : catColors.bg, borderRadius: "999px", padding: "1px 6px", fontWeight: 600 }}>
                        {cat?.label}
                      </span>
                      {!f.is_completed && (
                        <button
                          onClick={() => handleComplete(f.id)}
                          style={{
                            marginLeft: "auto", fontSize: "0.6875rem", padding: "0.25rem 0.625rem",
                            borderRadius: "999px", border: "none", cursor: "pointer",
                            background: catColors.color, color: "white", fontWeight: 700, fontFamily: "inherit",
                          }}
                        >
                          ✅ Hecho
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            {!loading && (tab === "active" ? active : completed).length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.625rem" }}>{tab === "active" ? "💝" : "🏆"}</div>
                <p style={{ fontSize: "0.875rem", fontWeight: 700, color: T.text, margin: "0 0 0.25rem" }}>
                  {tab === "active" ? "No hay favores activos" : "¡Aún no hay favores completados!"}
                </p>
                <p style={{ fontSize: "0.75rem", color: T.textMuted, margin: 0 }}>
                  {tab === "active" ? "Crea el primero en + Crear" : "Completa un favor y aparecerá aquí"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
