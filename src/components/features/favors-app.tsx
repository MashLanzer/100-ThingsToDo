"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Favor, FavorDifficulty, FavorCategory } from "@/types"
import { RefreshCw } from "lucide-react"

const DIFFICULTIES: { id: FavorDifficulty; label: string; pts: number; emoji: string }[] = [
  { id: "easy",   label: "Fácil",   pts: 10, emoji: "⭐" },
  { id: "medium", label: "Medio",   pts: 25, emoji: "⭐⭐" },
  { id: "hard",   label: "Difícil", pts: 50, emoji: "⭐⭐⭐" },
]

const CATEGORIES: { id: FavorCategory; label: string }[] = [
  { id: "romantic", label: "💕 Romántico" },
  { id: "fun",      label: "🎉 Divertido" },
  { id: "help",     label: "🤝 Ayuda" },
  { id: "surprise", label: "🎁 Sorpresa" },
]

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

  useEffect(() => {
    loadFavors()
    const interval = setInterval(loadFavors, 20_000)
    return () => clearInterval(interval)
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

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>💝 Favores</span>
        <button
          onClick={loadFavors}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center" }}
          title="Actualizar"
        >
          <RefreshCw size={14} color="var(--foreground-muted)" />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "white" }}>
        {(["active", "completed", "create"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "0.5rem 0.25rem", background: "none", border: "none",
              borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "var(--primary)" : "var(--foreground-muted)", marginBottom: "-1px",
            }}
          >
            {t === "active" ? "Activos" : t === "completed" ? "Hechos" : "+ Crear"}
          </button>
        ))}
      </div>

      <div className="app-content-body">
        {tab === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <input
              className="input"
              placeholder="Título del favor"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
            <textarea
              className="textarea"
              placeholder="Descripción..."
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
            />
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", marginBottom: "0.375rem", display: "block" }}>
                Dificultad & Puntos
              </label>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    style={{
                      flex: 1, padding: "0.375rem 0.25rem", borderRadius: "var(--radius-md)",
                      border: difficulty === d.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                      background: difficulty === d.id ? "var(--primary-lighter)" : "white",
                      cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 600,
                      textAlign: "center", color: difficulty === d.id ? "var(--primary)" : "var(--foreground-light)",
                    }}
                  >
                    <div>{d.emoji}</div>
                    <div>{d.label}</div>
                    <div>{d.pts}pts</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", marginBottom: "0.375rem", display: "block" }}>
                Categoría
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    style={{
                      padding: "0.2rem 0.5rem", borderRadius: "999px",
                      border: category === c.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                      background: category === c.id ? "var(--primary-lighter)" : "white",
                      cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                      color: category === c.id ? "var(--primary)" : "var(--foreground-light)",
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving} style={{ marginTop: "0.25rem" }}>
              {saving ? "Creando..." : "Crear Favor 💝"}
            </button>
          </div>
        )}

        {(tab === "active" || tab === "completed") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {loading ? (
              <p style={{ color: "var(--foreground-muted)", fontSize: "0.8125rem", textAlign: "center" }}>Cargando...</p>
            ) : (
              (tab === "active" ? active : completed).map((f) => {
                const diff = DIFFICULTIES.find((d) => d.id === f.difficulty)
                const cat = CATEGORIES.find((c) => c.id === f.category)
                return (
                  <div
                    key={f.id}
                    style={{
                      padding: "0.75rem",
                      background: f.is_completed ? "var(--muted)" : "white",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      opacity: f.is_completed ? 0.7 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h4 style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--foreground)", flex: 1 }}>
                        {f.title}
                      </h4>
                      <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--primary)", marginLeft: "0.5rem", flexShrink: 0 }}>
                        +{f.points}pts
                      </span>
                    </div>
                    {f.description && (
                      <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "0.2rem" }}>
                        {f.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.375rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{diff?.emoji} {diff?.label}</span>
                      <span style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>•</span>
                      <span style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{cat?.label}</span>
                      {!f.is_completed && (
                        <button
                          onClick={() => handleComplete(f.id)}
                          className="btn btn-primary"
                          style={{ marginLeft: "auto", fontSize: "0.625rem", padding: "0.2rem 0.5rem" }}
                        >
                          ✅ Completar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            {!loading && (tab === "active" ? active : completed).length === 0 && (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{tab === "active" ? "💝" : "🏆"}</div>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>
                  {tab === "active" ? "No hay favores activos. ¡Crea el primero!" : "Aún no hay favores completados."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
