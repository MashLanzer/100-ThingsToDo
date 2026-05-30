"use client"

import { useState } from "react"
import { usePlans, useCreatePlan } from "@/hooks/use-plans"
import { useCoupleStatus } from "@/hooks/use-couple"
import { PlanCard } from "@/components/features/plan-card"
import { useAppStore } from "@/stores/app-store"
import { useWindowPTR } from "@/hooks/use-window-ptr"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"

export default function DashboardPage() {
  const { data: plans, isLoading, refetch } = usePlans()
  const { data: coupleData } = useCoupleStatus()
  const createPlan = useCreatePlan()
  const { openCoupleModal } = useAppStore()
  const ptr = useWindowPTR(() => { refetch() })

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")

  const hasCouple = !!coupleData?.couple

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
          width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-lighter)",
          border: "2px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", color: "var(--primary)" }}>
          <span style={{ animation: ptr.spinning ? "ptr-spin 0.7s linear infinite" : "none" }}>
            {ptr.spinning ? "↻" : "↓"}
          </span>
        </div>
      )}
      {/* Link partner banner */}
      {!hasCouple && (
        <div className="link-partner-banner" style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "1.75rem", flexShrink: 0 }}>💌</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", marginBottom: "0.125rem" }}>
              ¡Conecta con tu pareja!
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-light)" }}>
              Comparte tu código o ingresa el de tu pareja para empezar a crear planes juntos.
            </p>
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: "0.8125rem" }} onClick={openCoupleModal}>
            Vincular
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
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
      ) : !plans || plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2 className="empty-title">No hay planes aún</h2>
          <p className="empty-text">
            {hasCouple
              ? "Crea tu primer plan romántico haciendo clic en el botón de arriba"
              : "Vincula a tu pareja para empezar a crear planes juntos"}
          </p>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}
