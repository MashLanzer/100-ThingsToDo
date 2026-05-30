"use client"

import { useState, useRef, useEffect } from "react"
import { usePlans, useCreatePlan } from "@/hooks/use-plans"
import { useCoupleStatus } from "@/hooks/use-couple"
import { PlanCard } from "@/components/features/plan-card"
import { useAppStore } from "@/stores/app-store"
import { useWindowPTR } from "@/hooks/use-window-ptr"
import { Plus, X, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { getFirebaseAuth } from "@/lib/firebase/client"
import type { Plan } from "@/types"

function SwipePlanCard({ plan, index, onDelete }: { plan: Plan; index: number; onDelete: () => void }) {
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number>(0)

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }
  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < 0) setSwipeX(Math.max(delta, -80))
    else setSwipeX(0)
  }
  function onTouchEnd() {
    setIsSwiping(false)
    if (swipeX < -50) setSwipeX(-80)
    else setSwipeX(0)
  }

  return (
    <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
          background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", borderRadius: "0 var(--radius-lg) var(--radius-lg) 0",
        }}
        onClick={onDelete}
      >
        <Trash2 size={22} color="white" />
      </div>
      <div
        style={{ transform: `translateX(${swipeX}px)`, transition: isSwiping ? "none" : "transform 0.25s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <PlanCard plan={plan} index={index} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: plans, isLoading, refetch } = usePlans()
  const { data: coupleData } = useCoupleStatus()
  const createPlan = useCreatePlan()
  const { openCoupleModal } = useAppStore()
  const ptr = useWindowPTR(() => { refetch() })

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const hasCouple = !!coupleData?.couple

  // Restore scroll position on mount, save on unmount
  useEffect(() => {
    const saved = sessionStorage.getItem("ttd_scroll_dashboard")
    if (saved) window.scrollTo(0, parseInt(saved, 10))
    return () => {
      sessionStorage.setItem("ttd_scroll_dashboard", String(window.scrollY))
    }
  }, [])

  const filteredPlans = plans?.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
  })

  async function handleDeletePlan(id: string) {
    if (!confirm("¿Eliminar este plan y todas sus tareas?")) return
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`/api/plans/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } })
      if (!res.ok) throw new Error("Error")
      toast.success("Plan eliminado 🗑")
      refetch()
    } catch { toast.error("Error al eliminar") }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("El título no puede estar vacío")
      return
    }
    try {
      await createPlan.mutateAsync({ title: title.trim(), description: desc.trim() || undefined })
      setTitle("")
      setDesc("")
      setShowForm(false)
      toast.success("Plan creado 🎉")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear plan")
    }
  }

  return (
    <div className="page-container">
      {/* Pull-to-refresh indicator */}
      {ptr.visible && (
        <div style={{ position: "fixed", top: "68px", left: "50%", transform: "translateX(-50%)", zIndex: 200,
          width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary-lighter)",
          border: "2px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(139,92,246,0.25)" }}>
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill="var(--primary)"
            style={{ animation: ptr.spinning ? "heartBeat 0.7s ease-in-out infinite" : "none", transition: "transform 0.2s" }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      )}
      {/* Link partner banner */}
      {!hasCouple && (
        <div
          style={{
            marginBottom: "1rem",
            borderRadius: "var(--radius-lg)",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--primary-lighter) 0%, var(--pink-light) 100%)",
            border: "1px solid var(--primary-light)",
          }}
        >
          {/* Decorative hearts background */}
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", opacity: 0.18, fontSize: "1.25rem", lineHeight: 1 }}>
            {["💕","💕","💕","💕","💕","💕","💕","💕","💕","💕","💕","💕"].map((h, i) => (
              <span key={i} style={{
                position: "absolute",
                left: `${(i * 17 + 3) % 100}%`,
                top: `${(i * 23 + 5) % 100}%`,
                transform: `rotate(${i * 30}deg)`,
                fontSize: i % 3 === 0 ? "1rem" : "0.75rem",
              }}>{h}</span>
            ))}
          </div>
          <div className="animate-bounce-slow" style={{ fontSize: "2rem", flexShrink: 0, position: "relative" }}>💌</div>
          <div style={{ flex: 1, position: "relative" }}>
            <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--foreground)", marginBottom: "0.125rem" }}>
              ¡Conecta con tu pareja!
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-light)" }}>
              Comparte vuestro código y empezad a crear recuerdos juntos 💕
            </p>
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: "0.8125rem", position: "relative" }} onClick={openCoupleModal}>
            Vincular 💕
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--foreground)" }}>
          Nuestros Planes 📋
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={!hasCouple}
            title={!hasCouple ? "Vincula una pareja para crear planes" : undefined}
          >
            <Plus size={18} />
            Nuevo Plan
          </button>
        </div>
      </div>

      {/* Search bar */}
      {plans && plans.length > 2 && (
        <div style={{ position: "relative", marginBottom: "0.875rem" }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--foreground-muted)", pointerEvents: "none" }} />
          <input
            className="input"
            type="search"
            placeholder="Buscar planes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
      )}

      {/* New plan form */}
      {showForm && (
        <div className="card animate-fade-in" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>Nuevo Plan</h2>
            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <input
              className="input"
              type="text"
              placeholder="Título del plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <textarea
              className="textarea"
              placeholder="Descripción (opcional)"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreate} disabled={createPlan.isPending}>
                {createPlan.isPending ? "Creando..." : "Crear"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="empty-state">
          <svg className="animate-heartbeat" width="40" height="40" viewBox="0 0 24 24" fill="#8B5CF6">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      ) : !plans || plans.length === 0 || (searchQuery.trim() && filteredPlans?.length === 0) ? (
        <div className="empty-state">
          <div className="empty-icon animate-bounce-slow">
            {hasCouple ? "💝" : "💌"}
          </div>
          <h2 className="empty-title" style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem" }}>
            {hasCouple ? "¡Sin planes aún!" : "¡Conecta con tu pareja!"}
          </h2>
          <p className="empty-text">
            {searchQuery.trim()
              ? "No hay planes que coincidan con tu búsqueda"
              : hasCouple
              ? "Crea vuestro primer plan romántico y empieza la aventura juntos ✨"
              : "Vincula a tu pareja para empezar a crear recuerdos juntos 💕"}
          </p>
          {hasCouple && (
            <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} onClick={() => setShowForm(true)}>
              ✨ Crear primer plan
            </button>
          )}
        </div>
      ) : (
        <div className="plans-grid">
          {(filteredPlans ?? plans ?? []).map((plan, i) => (
            <SwipePlanCard key={plan.id} plan={plan} index={i} onDelete={() => handleDeletePlan(plan.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
