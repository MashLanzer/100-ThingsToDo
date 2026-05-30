"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { SavingsGoal } from "@/types"
import { PhoneLoader } from "@/components/features/phone-loader"

interface Props { onBack: () => void }

export function SavingsGoalsApp({ onBack }: Props) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "create" | "detail">("list")
  const [selected, setSelected] = useState<SavingsGoal | null>(null)
  const [goalName, setGoalName] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [contribution, setContribution] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadGoals() }, [])

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

  async function loadGoals() {
    try {
      const data = await authFetch("/api/goals")
      setGoals(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function handleCreate() {
    if (!goalName.trim() || !goalTarget) return
    setSaving(true)
    try {
      await authFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({ name: goalName.trim(), target_amount: Number(goalTarget) }),
      })
      toast.success("Meta creada 💰")
      setGoalName("")
      setGoalTarget("")
      setView("list")
      loadGoals()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleContribute() {
    if (!selected || !contribution) return
    setSaving(true)
    try {
      await authFetch(`/api/goals/${selected.id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(contribution) }),
      })
      toast.success(`+$${contribution} aportado 🐖`)
      setContribution("")
      await loadGoals()
      // Refresh selected
      const updated = await authFetch(`/api/goals?id=${selected.id}`)
      if (Array.isArray(updated)) {
        const g = updated.find((g: SavingsGoal) => g.id === selected.id)
        if (g) setSelected(g)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  const totalSaved = goals.reduce((s, g) => s + (g.total_saved ?? 0), 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  if (view === "create") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span>💰 Nueva Meta</span>
        </div>
        <div className="app-content-body">
          <div className="form-group">
            <label className="form-label">Nombre de la meta</label>
            <input
              className="input"
              placeholder="Ej: Viaje a Japón"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad objetivo ($)</label>
            <input
              className="input"
              type="number"
              placeholder="Ej: 3000"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Creando..." : "Empezar a Ahorrar 🐖"}
          </button>
        </div>
      </>
    )
  }

  if (view === "detail" && selected) {
    const saved = selected.total_saved ?? 0
    const pct = selected.target_amount > 0 ? Math.min(100, Math.round((saved / selected.target_amount) * 100)) : 0
    const isComplete = pct >= 100
    // SVG circle ring
    const r = 52
    const circ = 2 * Math.PI * r
    const dash = (pct / 100) * circ

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span>🐖 {selected.name}</span>
        </div>
        <div className="app-content-body" style={{ alignItems: "center" }}>
          {/* Circular progress ring */}
          <div style={{ position: "relative", width: 130, height: 130, marginBottom: "0.5rem" }}>
            <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="65" cy="65" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
              <circle
                cx="65" cy="65" r={r}
                fill="none"
                stroke="url(#goalGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <defs>
                <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--secondary)" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "2px"
            }}>
              <span style={{ fontSize: isComplete ? "1.75rem" : "0.625rem", lineHeight: 1 }}>
                {isComplete ? "🎉" : "🐖"}
              </span>
              {!isComplete && (
                <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>
                  {pct}%
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
            <p style={{ fontWeight: 700, fontSize: "1.25rem", color: isComplete ? "var(--primary)" : "var(--foreground)", fontFamily: "'Fredoka', sans-serif" }}>
              {isComplete ? "¡Meta cumplida! 🎊" : selected.name}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginTop: "0.25rem" }}>
              <strong style={{ color: "var(--foreground)" }}>${saved.toLocaleString()}</strong>
              {" de "}
              <strong style={{ color: "var(--foreground)" }}>${selected.target_amount.toLocaleString()}</strong>
              {" ahorrados"}
            </p>
          </div>

          {!isComplete && (
            <div className="form-group" style={{ width: "100%" }}>
              <label className="form-label">Añadir aportación</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder="Importe ($)"
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                />
                <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleContribute} disabled={saving}>
                  {saving ? "..." : "Aportar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>💰 Metas Futuras</span>
      </div>
      <div className="app-content-body">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", textAlign: "center" }}>
          {[
            { label: "Metas", value: goals.length },
            { label: "Ahorrado", value: `$${totalSaved}` },
            { label: "Objetivo", value: `$${totalTarget}` },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--muted)", borderRadius: "var(--radius-md)", padding: "0.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--primary)" }}>{s.value}</div>
              <div style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <PhoneLoader />
        ) : goals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <div className="animate-bounce-slow" style={{ fontSize: "2.25rem" }}>🐖</div>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>
              ¡Empieza a ahorrar!
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
              Crea vuestra primera meta juntos 🌟
            </p>
          </div>
        ) : (
          goals.map((g) => {
            const saved = g.total_saved ?? 0
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((saved / g.target_amount) * 100)) : 0
            const isComplete = pct >= 100
            return (
              <button
                key={g.id}
                onClick={() => { setSelected(g); setView("detail") }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem",
                  background: isComplete ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" : "white",
                  borderRadius: "var(--radius-lg)",
                  border: isComplete ? "1.5px solid #6ee7b7" : "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              >
                {/* Mini SVG ring */}
                {(() => {
                  const r = 16
                  const circ = 2 * Math.PI * r
                  const dash = (pct / 100) * circ
                  return (
                    <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                      <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" />
                        <circle
                          cx="20" cy="20" r={r}
                          fill="none"
                          stroke="url(#miniGoalGrad)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${circ}`}
                        />
                        <defs>
                          <linearGradient id="miniGoalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--primary)" />
                            <stop offset="100%" stopColor="var(--secondary)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isComplete ? (
                          <span style={{ fontSize: "1rem" }}>🎉</span>
                        ) : (
                          <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.5625rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.25rem" }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>
                    ${saved.toLocaleString()} / ${g.target_amount.toLocaleString()}
                  </div>
                </div>
              </button>
            )
          })
        )}

        <button className="btn btn-primary" onClick={() => setView("create")}>
          💰 Crear Nueva Meta
        </button>
      </div>
    </>
  )
}
