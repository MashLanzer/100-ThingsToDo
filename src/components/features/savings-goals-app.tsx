"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { SavingsGoal } from "@/types"
import { PhoneLoader } from "@/components/features/phone-loader"
import { formatDate } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Plane, Home, Car, Gem, Baby, GraduationCap, Laptop, Umbrella, Target, Wallet, Moon, Tent, Gift, PiggyBank, Sparkles, Trash2, Pencil, ClipboardList } from "lucide-react"
import type { LucideProps } from "lucide-react"

type GoalIcon = { key: string; Icon: React.FC<LucideProps>; label: string }
const GOAL_ICONS: GoalIcon[] = [
  { key: "piggy",   Icon: PiggyBank,     label: "Alcancía" },
  { key: "travel",  Icon: Plane,         label: "Viaje" },
  { key: "home",    Icon: Home,          label: "Casa" },
  { key: "car",     Icon: Car,           label: "Auto" },
  { key: "ring",    Icon: Gem,           label: "Anillo" },
  { key: "baby",    Icon: Baby,          label: "Bebé" },
  { key: "school",  Icon: GraduationCap, label: "Educación" },
  { key: "laptop",  Icon: Laptop,        label: "Tecnología" },
  { key: "beach",   Icon: Umbrella,      label: "Playa" },
  { key: "goal",    Icon: Target,        label: "Meta" },
  { key: "savings", Icon: Wallet,        label: "Ahorros" },
  { key: "moon",    Icon: Moon,          label: "Sueño" },
  { key: "camp",    Icon: Tent,          label: "Camping" },
  { key: "gift",    Icon: Gift,          label: "Regalo" },
  { key: "other",   Icon: Sparkles,      label: "Otro" },
]
function getGoalIcon(key: string | undefined): React.FC<LucideProps> {
  return GOAL_ICONS.find(g => g.key === key)?.Icon ?? PiggyBank
}

interface Contribution { id: string; amount: number; contributed_by: string; created_at: string }
interface Props { onBack: () => void }

export function SavingsGoalsApp({ onBack }: Props) {
  const { user } = useAuth()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "create" | "detail">("list")
  const [selected, setSelected] = useState<SavingsGoal | null>(null)
  const [goalName, setGoalName] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [contribution, setContribution] = useState("")
  const [saving, setSaving] = useState(false)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loadingContribs, setLoadingContribs] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [editGoalName, setEditGoalName] = useState("")
  const [editGoalTarget, setEditGoalTarget] = useState("")
  const [goalIconKey, setGoalIconKey] = useState("piggy")
  const [editGoalIconKey, setEditGoalIconKey] = useState("piggy")

  useEffect(() => { loadGoals() }, [])

  useEffect(() => {
    if (view === "detail" && selected) {
      loadContributions(selected.id)
    }
  }, [view, selected?.id])

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

  async function loadContributions(goalId: string) {
    setLoadingContribs(true)
    try {
      const data = await authFetch(`/api/goals/${goalId}/contributions`)
      setContributions(Array.isArray(data) ? data : [])
    } catch { setContributions([]) } finally { setLoadingContribs(false) }
  }

  async function handleCreate() {
    if (!goalName.trim() || !goalTarget) return
    setSaving(true)
    try {
      await authFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({ name: goalName.trim(), target_amount: Number(goalTarget), emoji: goalIconKey }),
      })
      toast.success("Meta creada")
      setGoalName("")
      setGoalTarget("")
      setGoalIconKey("piggy")
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
      const amount = Number(contribution)
      setContribution("")
      await loadGoals()
      const updated = await authFetch(`/api/goals?id=${selected.id}`)
      if (Array.isArray(updated)) {
        const g = updated.find((g: SavingsGoal) => g.id === selected.id)
        if (g) {
          const newPct = g.target_amount > 0 ? Math.min(100, Math.round(((g.total_saved ?? 0) / g.target_amount) * 100)) : 0
          if (newPct >= 100) {
            toast.success("¡Meta completada!")
          } else {
            toast.success(`+$${amount} aportado`)
          }
          setSelected(g)
        }
      }
      loadContributions(selected.id)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleEditGoal() {
    if (!selected || !editGoalName.trim() || !editGoalTarget) return
    setSaving(true)
    try {
      const updated = await authFetch(`/api/goals/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editGoalName.trim(), target_amount: Number(editGoalTarget), emoji: editGoalIconKey }),
      })
      setSelected(updated)
      setEditingGoal(false)
      toast.success("Meta actualizada")
      loadGoals()
    } catch { toast.error("Error al actualizar") } finally { setSaving(false) }
  }

  async function handleDeleteGoal() {
    if (!selected) return
    if (!confirm("¿Eliminar esta meta y todas sus aportaciones?")) return
    try {
      await authFetch(`/api/goals/${selected.id}`, { method: "DELETE" })
      toast.success("Meta eliminada")
      setView("list")
      loadGoals()
    } catch { toast.error("Error al eliminar") }
  }

  async function handleDeleteContribution(goalId: string, contribId: string) {
    if (!confirm("¿Eliminar esta aportación?")) return
    try {
      await authFetch(`/api/goals/${goalId}/contributions?contributionId=${contribId}`, { method: "DELETE" })
      toast.success("Aportación eliminada")
      loadContributions(goalId)
      loadGoals()
    } catch { toast.error("Error al eliminar") }
  }

  const totalSaved = goals.reduce((s, g) => s + (g.total_saved ?? 0), 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  if (view === "create") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Wallet size={14} /> Nueva Meta</span>
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
            <label className="form-label">Ícono de la meta</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {GOAL_ICONS.map(({ key, Icon }) => (
                <button key={key} onClick={() => setGoalIconKey(key)} title={key} style={{
                  width: 38, height: 38, borderRadius: "10px",
                  border: goalIconKey === key ? "2px solid var(--primary)" : "2px solid transparent",
                  background: goalIconKey === key ? "var(--primary-lighter)" : "var(--muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon size={18} color={goalIconKey === key ? "var(--primary)" : "var(--foreground-muted)"} /></button>
              ))}
            </div>
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
            {saving ? "Creando..." : "Empezar a Ahorrar"}
          </button>
        </div>
      </>
    )
  }

  if (view === "detail" && selected) {
    const saved = selected.total_saved ?? 0
    const pct = selected.target_amount > 0 ? Math.min(100, Math.round((saved / selected.target_amount) * 100)) : 0
    const isComplete = pct >= 100
    const r = 52
    const circ = 2 * Math.PI * r
    const dash = (pct / 100) * circ

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
            {(() => { const Icon = getGoalIcon(selected.emoji); return <Icon size={14} /> })()}
            {selected.name}
          </span>
          <button
            onClick={() => { setEditGoalName(selected.name); setEditGoalTarget(String(selected.target_amount)); setEditGoalIconKey(selected.emoji ?? "piggy"); setEditingGoal(true) }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "4px", display: "flex", alignItems: "center", flexShrink: 0 }}
          ><Pencil size={14} /></button>
        </div>

        {editingGoal && (
          <div style={{ padding: "0.75rem", background: "var(--primary-lighter)", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input className="input" value={editGoalName} onChange={(e) => setEditGoalName(e.target.value)} placeholder="Nombre" autoFocus />
            <input className="input" type="number" value={editGoalTarget} onChange={(e) => setEditGoalTarget(e.target.value)} placeholder="Objetivo ($)" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {GOAL_ICONS.map(({ key, Icon }) => (
                <button key={key} onClick={() => setEditGoalIconKey(key)} title={key} style={{
                  width: 38, height: 38, borderRadius: "10px",
                  border: editGoalIconKey === key ? "2px solid var(--primary)" : "2px solid transparent",
                  background: editGoalIconKey === key ? "var(--primary-lighter)" : "var(--muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon size={18} color={editGoalIconKey === key ? "var(--primary)" : "var(--foreground-muted)"} /></button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-primary" onClick={handleEditGoal} disabled={saving} style={{ flex: 1 }}>
                {saving ? "..." : "Guardar"}
              </button>
              <button className="btn btn-outline" onClick={() => setEditingGoal(false)} style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        )}
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
              {isComplete ? (
                <Sparkles size={28} color="var(--primary)" />
              ) : (
                <>
                  {(() => { const Icon = getGoalIcon(selected.emoji); return <Icon size={18} color="var(--primary)" /> })()}
                  <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>
                    {pct}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
            <p style={{ fontWeight: 700, fontSize: "1.25rem", color: isComplete ? "var(--primary)" : "var(--foreground)", fontFamily: "'Fredoka', sans-serif" }}>
              {isComplete ? "¡Meta cumplida!" : selected.name}
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

          {/* Contribution history */}
          <div style={{ width: "100%", marginTop: "0.5rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--foreground)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 4 }}>
              <ClipboardList size={13} /> Historial de aportaciones
            </p>
            {loadingContribs ? (
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", textAlign: "center" }}>Cargando...</p>
            ) : contributions.length === 0 ? (
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", textAlign: "center", padding: "0.5rem 0" }}>
                Sin aportaciones aún
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {contributions.slice(0, 10).map((c) => {
                  const isMe = c.contributed_by === user?.uid
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: isMe ? "var(--primary)" : "var(--secondary)",
                      }} />
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground)" }}>
                        +${Number(c.amount).toLocaleString()}
                      </span>
                      <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", flex: 1 }}>
                        {isMe ? "Tú" : "Pareja"} · {formatDate(c.created_at)}
                      </span>
                      {c.contributed_by === user?.uid && (
                        <button
                          onClick={() => handleDeleteContribution(selected.id, c.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "2px", opacity: 0.6, display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Delete goal */}
          <button
            className="btn btn-outline"
            style={{ width: "100%", marginTop: "1rem", color: "#ef4444", borderColor: "#fca5a5", fontSize: "0.8125rem" }}
            onClick={handleDeleteGoal}
          >
            <Trash2 size={14} style={{ marginRight: 4 }} /> Eliminar esta meta
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Wallet size={14} /> Metas Futuras</span>
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
            <div className="animate-bounce-slow"><PiggyBank size={36} color="var(--foreground-muted)" /></div>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>
              ¡Empieza a ahorrar!
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
              Crea vuestra primera meta juntos
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
                          <Sparkles size={14} color="var(--primary)" />
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
          <Wallet size={16} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} /> Crear Nueva Meta
        </button>
      </div>
    </>
  )
}
