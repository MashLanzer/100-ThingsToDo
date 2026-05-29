"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { SavingsGoal } from "@/types"

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

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span>💰 {selected.name}</span>
        </div>
        <div className="app-content-body" style={{ alignItems: "center" }}>
          <div style={{ fontSize: "3rem" }}>🐖</div>
          <div style={{ width: "100%", marginBottom: "0.5rem" }}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--primary)" }}>{pct}%</p>
          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8125rem", color: "var(--foreground-light)" }}>
            <span>Ahorrado: <strong style={{ color: "var(--foreground)" }}>${saved}</strong></span>
            <span>Objetivo: <strong style={{ color: "var(--foreground)" }}>${selected.target_amount}</strong></span>
          </div>

          <div className="form-group" style={{ width: "100%" }}>
            <label className="form-label">Añadir aportación</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                className="input"
                type="number"
                placeholder="Importe ($)"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
              />
              <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleContribute} disabled={saving}>
                Aportar
              </button>
            </div>
          </div>
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
          <div style={{ textAlign: "center", padding: "1rem", color: "var(--foreground-muted)", fontSize: "0.875rem" }}>
            Cargando...
          </div>
        ) : goals.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2.5rem" }}>🎯</div>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>¡Tu primera meta te espera!</p>
          </div>
        ) : (
          goals.map((g) => {
            const saved = g.total_saved ?? 0
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((saved / g.target_amount) * 100)) : 0
            return (
              <button
                key={g.id}
                onClick={() => { setSelected(g); setView("detail") }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                  padding: "0.75rem",
                  background: "white",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>💰 {g.name}</span>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>
                  ${saved} / ${g.target_amount} — {pct}%
                </span>
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
