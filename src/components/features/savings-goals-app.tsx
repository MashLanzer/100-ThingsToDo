"use client"

import { useState, useEffect, useRef } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { SavingsGoal } from "@/types"
import { PhoneLoader } from "@/components/features/phone-loader"
import { formatDate } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Plane, Home, Car, Gem, Baby, GraduationCap, Laptop, Umbrella, Target, Wallet, Moon, Tent, Gift, PiggyBank, Sparkles, Trash2, Pencil, ClipboardList } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import type { LucideProps } from "lucide-react"

function relativeContribDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "hoy"
  if (diff === 1) return "ayer"
  if (diff < 7) return `hace ${diff} días`
  if (diff < 30) return `hace ${Math.floor(diff / 7)} sem`
  if (diff < 365) return `hace ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? "es" : ""}`
  return formatDate(dateStr)
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(amount)
}

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

function progressColor(pct: number): string {
  if (pct >= 100) return "#34d399"
  if (pct >= 70)  return "#4ade80"
  if (pct >= 30)  return "#fbbf24"
  return "#f87171"
}

function progressBg(pct: number): string {
  if (pct >= 100) return "linear-gradient(160deg,#0a2e1a,#0f3d24,#155030)"
  if (pct >= 70)  return "linear-gradient(160deg,#0a1f15,#0f2e1e,#143d28)"
  if (pct >= 30)  return "linear-gradient(160deg,#1c1400,#2e2000,#3d2d00)"
  return "linear-gradient(160deg,#2e0a0a,#3d1414,#501a1a)"
}

interface Contribution { id: string; amount: number; contributed_by: string; created_at: string; note?: string | null }
interface Props { onBack: () => void }

const APP_CSS = `
@keyframes goalCardIn {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes piggyBounce {
  0%,100% { transform: translateY(0) rotate(0deg); }
  30%     { transform: translateY(-10px) rotate(-8deg); }
  60%     { transform: translateY(-5px) rotate(5deg); }
}
@keyframes coinFloat {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(-50px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-70px) scale(0.8); }
}
@keyframes goalCelebrate {
  0%,100% { transform: scale(1); filter: brightness(1); }
  50%     { transform: scale(1.04); filter: brightness(1.25); }
}
@keyframes fillBar {
  from { width: 0; }
  to   { width: var(--bar-w); }
}
@keyframes countFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes detailSlideIn {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes urgentBlink {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.45; }
}
`

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
  const [goalDeadline, setGoalDeadline] = useState("")
  const [editGoalDeadline, setEditGoalDeadline] = useState("")
  const [contribNote, setContribNote] = useState("")
  const [withdrawMode, setWithdrawMode] = useState(false)
  const [showCoin, setShowCoin] = useState(false)
  const coinRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadGoals() }, [])
  useEffect(() => {
    if (view === "detail" && selected) loadContributions(selected.id)
  }, [view, selected?.id])

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
        body: JSON.stringify({ name: goalName.trim(), target_amount: Number(goalTarget), emoji: goalIconKey, deadline: goalDeadline || null }),
      })
      toast.success("¡Meta creada! 🎯")
      setGoalName(""); setGoalTarget(""); setGoalIconKey("piggy"); setGoalDeadline("")
      setView("list"); loadGoals()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleContribute() {
    if (!selected || !contribution) return
    const rawAmount = Number(contribution)
    const amount = withdrawMode ? -Math.abs(rawAmount) : Math.abs(rawAmount)
    if (withdrawMode && (selected.total_saved ?? 0) + amount < 0) {
      toast.error("No hay suficiente saldo para retirar")
      return
    }
    setSaving(true)
    try {
      await authFetch(`/api/goals/${selected.id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount, note: contribNote.trim() || null }),
      })
      setContribution(""); setContribNote(""); setWithdrawMode(false)
      // coin animation
      setShowCoin(true)
      if (coinRef.current) clearTimeout(coinRef.current)
      coinRef.current = setTimeout(() => setShowCoin(false), 900)
      await loadGoals()
      const updated = await authFetch(`/api/goals?id=${selected.id}`)
      if (Array.isArray(updated)) {
        const g = updated.find((g: SavingsGoal) => g.id === selected.id)
        if (g) {
          const newPct = g.target_amount > 0 ? Math.min(100, Math.round(((g.total_saved ?? 0) / g.target_amount) * 100)) : 0
          if (newPct >= 100) toast.success("¡Meta cumplida! 🎉")
          else if (amount < 0) toast.success(`📤 Retirada de ${formatEuro(Math.abs(amount))}`)
          else toast.success(`+${formatEuro(Number(amount))} aportado 🪙`)
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
        body: JSON.stringify({ name: editGoalName.trim(), target_amount: Number(editGoalTarget), emoji: editGoalIconKey, deadline: editGoalDeadline || null }),
      })
      setSelected(updated); setEditingGoal(false)
      toast.success("Meta actualizada"); loadGoals()
    } catch { toast.error("Error al actualizar") } finally { setSaving(false) }
  }

  async function handleDeleteGoal() {
    if (!selected) return
    if (!await showConfirm({ title: "Eliminar meta", message: "Se borrarán la meta y todas las aportaciones.", danger: true })) return
    try {
      await authFetch(`/api/goals/${selected.id}`, { method: "DELETE" })
      toast.success("Meta eliminada"); setView("list"); loadGoals()
    } catch { toast.error("Error al eliminar") }
  }

  async function handleDeleteContribution(goalId: string, contribId: string) {
    if (!await showConfirm({ title: "Eliminar aportación", danger: true })) return
    try {
      await authFetch(`/api/goals/${goalId}/contributions?contributionId=${contribId}`, { method: "DELETE" })
      toast.success("Aportación eliminada"); loadContributions(goalId); loadGoals()
    } catch { toast.error("Error al eliminar") }
  }

  const totalSaved = goals.reduce((s, g) => s + (g.total_saved ?? 0), 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
    borderRadius: 12, padding: "0.625rem 0.875rem", color: "#f1f5f9",
    fontSize: "0.875rem", fontFamily: "inherit", outline: "none",
  }

  // ── CREATE VIEW ───────────────────────────────────────────────────────────
  if (view === "create") {
    const GoalIconPreview = getGoalIcon(goalIconKey)
    return (
      <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#0a1f15 0%,#0f2e1e 50%,#143d28 100%)", display: "flex", flexDirection: "column" }}>
        <style>{APP_CSS}</style>
        <div style={{ padding: "0.875rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => setView("list")} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "#f1f5f9", margin: 0 }}>💰 Nueva Meta</p>
        </div>

        <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre</label>
            <input style={inputStyle} placeholder="Ej: Viaje a Japón 🗼" value={goalName} onChange={(e) => setGoalName(e.target.value)} autoFocus />
          </div>

          {/* Icon */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Icono</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {GOAL_ICONS.map(({ key, Icon }) => {
                const active = goalIconKey === key
                return (
                  <button key={key} onClick={() => setGoalIconKey(key)} title={key} style={{
                    width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer",
                    background: active ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)",
                    border: active ? "1.5px solid #34d39966" : "1.5px solid rgba(255,255,255,0.08)",
                    boxShadow: active ? "0 0 12px rgba(52,211,153,0.3)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  } as React.CSSProperties}>
                    <Icon size={19} color={active ? "#34d399" : "#64748b"} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Target */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cantidad objetivo</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700, fontSize: "0.9375rem", pointerEvents: "none" }}>€</span>
              <input style={{ ...inputStyle, paddingLeft: "2rem" }} type="number" placeholder="3000" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
            </div>
          </div>

          {/* Deadline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>📅 Fecha objetivo (opcional)</label>
            <input style={inputStyle} type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
          </div>

          {/* Live preview */}
          {goalName && (
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1.5px solid rgba(52,211,153,0.25)", borderRadius: 16, padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(52,211,153,0.15)", border: "1.5px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GoalIconPreview size={22} color="#34d399" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#f1f5f9", margin: 0 }}>{goalName}</p>
                <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: "2px 0 0" }}>
                  {goalTarget ? `Objetivo: ${formatEuro(Number(goalTarget))}` : "0% · Sin aportaciones aún"}
                </p>
              </div>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.15)", padding: "2px 8px", borderRadius: 20 }}>0%</span>
            </div>
          )}

          <button
            onClick={handleCreate} disabled={saving}
            style={{ padding: "0.875rem", border: "none", borderRadius: 14, cursor: saving ? "not-allowed" : "pointer", background: saving ? "rgba(52,211,153,0.3)" : "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontWeight: 700, fontSize: "1rem", fontFamily: "inherit" }}
          >
            {saving ? "Creando..." : "🎯 Empezar a Ahorrar"}
          </button>
        </div>
      </div>
    )
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const saved = selected.total_saved ?? 0
    const pct = selected.target_amount > 0 ? Math.min(100, Math.round((saved / selected.target_amount) * 100)) : 0
    const isComplete = pct >= 100
    const r = 54
    const circ = 2 * Math.PI * r
    const dash = (pct / 100) * circ
    const color = progressColor(pct)
    const bg = progressBg(pct)
    const GoalIcon = getGoalIcon(selected.emoji)
    const remaining = Math.max(0, selected.target_amount - saved)

    let deadlineDays: number | null = null
    if (selected.deadline) {
      deadlineDays = Math.ceil((new Date(selected.deadline).getTime() - Date.now()) / 86400000)
    }

    return (
      <div style={{ minHeight: "100%", background: bg, display: "flex", flexDirection: "column", animation: "detailSlideIn 0.3s ease" }}>
        <style>{APP_CSS}</style>

        {/* Coin float animation */}
        {showCoin && (
          <div style={{ position: "fixed", left: "50%", top: "55%", transform: "translateX(-50%)", fontSize: "2rem", zIndex: 999, animation: "coinFloat 0.9s ease forwards", pointerEvents: "none" }}>
            🪙
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "0.875rem 1rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => setView("list")} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => { setEditGoalName(selected.name); setEditGoalTarget(String(selected.target_amount)); setEditGoalIconKey(selected.emoji ?? "piggy"); setEditGoalDeadline(selected.deadline ?? ""); setEditingGoal(!editingGoal) }}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}
              ><Pencil size={14} /></button>
              <button
                onClick={handleDeleteGoal}
                style={{ background: "rgba(248,113,113,0.12)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}
              ><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Ring */}
          <div style={{ position: "relative", width: 140, height: 140 }}>
            <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
              <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.5s" }}
                filter={isComplete ? `drop-shadow(0 0 8px ${color})` : undefined} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              {isComplete ? (
                <span style={{ fontSize: "2.5rem", animation: "goalCelebrate 1.5s ease infinite" }}>✨</span>
              ) : (
                <>
                  <GoalIcon size={24} color={color} />
                  <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1 }}>{pct}%</span>
                </>
              )}
            </div>
          </div>

          <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.125rem", color: "#f1f5f9", margin: 0, textAlign: "center" }}>
            {isComplete ? "¡Meta cumplida! 🎉" : selected.name}
          </p>
        </div>

        {/* Edit panel */}
        {editingGoal && (
          <div style={{ padding: "0.875rem 1rem", background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input style={inputStyle} value={editGoalName} onChange={(e) => setEditGoalName(e.target.value)} placeholder="Nombre" autoFocus />
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700, pointerEvents: "none" }}>€</span>
              <input style={{ ...inputStyle, paddingLeft: "2rem" }} type="number" value={editGoalTarget} onChange={(e) => setEditGoalTarget(e.target.value)} placeholder="Objetivo (€)" />
            </div>
            <input style={inputStyle} type="date" value={editGoalDeadline} onChange={(e) => setEditGoalDeadline(e.target.value)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {GOAL_ICONS.map(({ key, Icon }) => {
                const active = editGoalIconKey === key
                return (
                  <button key={key} onClick={() => setEditGoalIconKey(key)} title={key} style={{ width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer", background: active ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)", border: active ? "1.5px solid #34d39966" : "1.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" } as React.CSSProperties}>
                    <Icon size={16} color={active ? "#34d399" : "#64748b"} />
                  </button>
                )
              })}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleEditGoal} disabled={saving} style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontWeight: 700, fontFamily: "inherit" }}>
                {saving ? "..." : "Guardar"}
              </button>
              <button onClick={() => setEditingGoal(false)} style={{ flex: 1, padding: "0.5rem", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontWeight: 700, fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.875rem", overflowY: "auto" }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem" }}>
            {[
              { emoji: "💰", label: "Ahorrado",  value: formatEuro(saved) },
              { emoji: "🎯", label: "Falta",      value: isComplete ? "¡Listo!" : formatEuro(remaining) },
              { emoji: "📅", label: deadlineDays !== null ? (deadlineDays < 0 ? "Vencida" : `${deadlineDays}d`) : "Sin fecha", value: deadlineDays !== null ? (deadlineDays < 0 ? "⚠️" : `${deadlineDays}d`) : "—" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "0.625rem 0.5rem", textAlign: "center", animation: `countFade 0.4s ease both`, animationDelay: `${i * 0.1}s` }}>
                <div style={{ fontSize: "1rem", marginBottom: 2 }}>{s.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#f1f5f9", fontFamily: "'Fredoka',sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: "0.5rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Celebrate banner */}
          {isComplete && (
            <div style={{ background: "rgba(52,211,153,0.15)", border: "1.5px solid rgba(52,211,153,0.4)", borderRadius: 16, padding: "0.875rem 1rem", textAlign: "center", animation: "goalCelebrate 2s ease infinite" }}>
              <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#34d399", margin: 0 }}>🎉 ¡Meta cumplida! Lo conseguisteis</p>
              <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: "4px 0 0" }}>Habéis ahorrado {formatEuro(saved)} juntos</p>
            </div>
          )}

          {/* Contribute */}
          {!isComplete && (
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "0.875rem" }}>
              <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.625rem" }}>
                <button onClick={() => setWithdrawMode(false)} style={{ flex: 1, padding: "0.5rem", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "0.8125rem", background: !withdrawMode ? "linear-gradient(135deg,#059669,#34d399)" : "rgba(255,255,255,0.06)", color: !withdrawMode ? "#fff" : "#64748b" }}>
                  💰 Añadir
                </button>
                <button onClick={() => setWithdrawMode(true)} style={{ flex: 1, padding: "0.5rem", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "0.8125rem", background: withdrawMode ? "linear-gradient(135deg,#dc2626,#f87171)" : "rgba(255,255,255,0.06)", color: withdrawMode ? "#fff" : "#64748b" }}>
                  📤 Retirar
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700, pointerEvents: "none" }}>€</span>
                  <input style={{ ...inputStyle, paddingLeft: "2rem" }} type="number" inputMode="numeric" placeholder={withdrawMode ? "Importe a retirar" : "Importe"} value={contribution} onChange={(e) => setContribution(e.target.value)} />
                </div>
                <button onClick={handleContribute} disabled={saving} style={{ flexShrink: 0, padding: "0 1rem", border: "none", borderRadius: 12, cursor: saving ? "not-allowed" : "pointer", background: withdrawMode ? "linear-gradient(135deg,#dc2626,#f87171)" : "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontWeight: 700, fontFamily: "inherit", fontSize: "0.875rem" }}>
                  {saving ? "..." : withdrawMode ? "Retirar" : "Aportar"}
                </button>
              </div>
              <input style={inputStyle} placeholder="💬 Nota opcional" maxLength={100} value={contribNote} onChange={(e) => setContribNote(e.target.value)} />
            </div>
          )}

          {/* History */}
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#94a3b8", marginBottom: "0.625rem", display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.6875rem" }}>
              <ClipboardList size={12} /> Historial de aportaciones
            </p>
            {loadingContribs ? (
              <p style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "center" }}>Cargando...</p>
            ) : contributions.length === 0 ? (
              <p style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "center", padding: "0.5rem 0" }}>Sin aportaciones aún</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {contributions.slice(0, 10).map((c) => {
                  const isMe = c.contributed_by === user?.uid
                  const isWithdrawal = Number(c.amount) < 0
                  return (
                    <div key={c.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, borderLeft: `3px solid ${isWithdrawal ? "#f87171" : (isMe ? "#34d399" : "#60a5fa")}`, padding: "0.625rem 0.75rem", display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMe ? "rgba(52,211,153,0.15)" : "rgba(96,165,250,0.15)", border: `1.5px solid ${isMe ? "#34d39944" : "#60a5fa44"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: isMe ? "#34d399" : "#60a5fa" }}>
                        {isMe ? "Yo" : "👫"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: isWithdrawal ? "#f87171" : "#f1f5f9" }}>
                            {isWithdrawal ? `📤 -${formatEuro(Math.abs(Number(c.amount)))}` : `+${formatEuro(Number(c.amount))}`}
                          </span>
                          <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>{relativeContribDate(c.created_at)}</span>
                        </div>
                        {c.note && (
                          <p style={{ fontSize: "0.6875rem", color: "#94a3b8", fontStyle: "italic", margin: "2px 0 0" }}>"{c.note}"</p>
                        )}
                      </div>
                      {isMe && (
                        <button onClick={() => handleDeleteContribution(selected.id, c.id)} style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", padding: "0.25rem", borderRadius: 6, color: "#64748b", display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#0a1f15 0%,#0f2e1e 50%,#143d28 100%)", display: "flex", flexDirection: "column" }}>
      <style>{APP_CSS}</style>

      {/* Header */}
      <div style={{ padding: "0.875rem 1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.1875rem", color: "#f1f5f9", margin: 0 }}>🐷 Metas Futuras</p>
            <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: 0 }}>Ahorrando juntos</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "0.625rem" }}>
          {[
            { emoji: "🎯", label: "Metas",    value: String(goals.length),    color: "#34d399" },
            { emoji: "💰", label: "Ahorrado", value: formatEuro(totalSaved),  color: "#4ade80" },
            { emoji: "🏦", label: "Objetivo", value: formatEuro(totalTarget), color: "#a3e635" },
          ].map((s, i) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "0.5rem", textAlign: "center", animation: `countFade 0.4s ease both`, animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: "0.9375rem" }}>{s.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: s.color, fontFamily: "'Fredoka',sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: "0.5rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Global progress bar */}
        {totalTarget > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>Progreso total</span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#34d399" }}>{totalPct}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#059669,#34d399)", width: `${totalPct}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem", overflowY: "auto" }}>
        <button
          onClick={() => setView("create")}
          style={{ padding: "0.75rem", border: "none", borderRadius: 14, cursor: "pointer", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit" }}
        >
          💰 Crear Nueva Meta
        </button>

        {loading ? <PhoneLoader /> : goals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "3.5rem", display: "block", animation: "piggyBounce 2.5s ease infinite" }}>🐷</span>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "#f1f5f9", margin: 0 }}>¡Empieza a ahorrar juntos!</p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>Cread vuestra primera meta de pareja</p>
          </div>
        ) : (
          goals.map((g, i) => {
            const saved = g.total_saved ?? 0
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((saved / g.target_amount) * 100)) : 0
            const isComplete = pct >= 100
            const color = progressColor(pct)
            const GoalIcon = getGoalIcon(g.emoji)
            const r = 16
            const circ = 2 * Math.PI * r
            const dash = (pct / 100) * circ

            let deadlineDays: number | null = null
            let isUrgentDeadline = false
            if (g.deadline && !isComplete) {
              deadlineDays = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
              isUrgentDeadline = deadlineDays !== null && deadlineDays <= 7
            }

            return (
              <button
                key={g.id}
                onClick={() => { setSelected(g); setView("detail") }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem",
                  background: isComplete ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                  borderRadius: 16, border: isComplete ? "1.5px solid rgba(52,211,153,0.35)" : "1.5px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                  animation: `goalCardIn 0.4s ease both`, animationDelay: `${i * 0.07}s`,
                  boxShadow: isComplete ? "0 4px 16px rgba(52,211,153,0.12)" : "none",
                }}
              >
                {/* Ring */}
                <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                  <svg width="44" height="44" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                    <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isComplete ? <span style={{ fontSize: "1rem" }}>✨</span> : <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "0.5625rem", fontWeight: 700, color, lineHeight: 1 }}>{pct}%</span>}
                  </div>
                </div>

                {/* Colored icon circle */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${color}18`, border: `1.5px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <GoalIcon size={18} color={color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</p>
                  <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: "2px 0 0" }}>{formatEuro(saved)} / {formatEuro(g.target_amount)}</p>
                  {deadlineDays !== null && (
                    <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.5625rem", fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: deadlineDays < 0 ? "rgba(248,113,113,0.2)" : isUrgentDeadline ? "rgba(251,191,36,0.2)" : "rgba(52,211,153,0.15)", color: deadlineDays < 0 ? "#f87171" : isUrgentDeadline ? "#fbbf24" : "#34d399", animation: isUrgentDeadline ? "urgentBlink 1.2s ease infinite" : "none" }}>
                      📅 {deadlineDays < 0 ? "⚠️ vencida" : deadlineDays === 0 ? "⚠️ hoy" : `${deadlineDays}d`}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
