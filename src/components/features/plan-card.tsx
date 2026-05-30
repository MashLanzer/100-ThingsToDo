"use client"

import { useRouter } from "next/navigation"
import type { Plan } from "@/types"

const PLAN_GRADIENTS = [
  "linear-gradient(90deg, #8B5CF6, #EC4899)",
  "linear-gradient(90deg, #06B6D4, #10B981)",
  "linear-gradient(90deg, #F59E0B, #EF4444)",
  "linear-gradient(90deg, #EC4899, #A78BFA)",
  "linear-gradient(90deg, #10B981, #3B82F6)",
  "linear-gradient(90deg, #3B82F6, #8B5CF6)",
]

interface Props {
  plan: Plan
  index?: number
}

export function PlanCard({ plan, index = 0 }: Props) {
  const router = useRouter()
  const total = plan.task_count ?? 0
  const done = plan.completed_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete = total > 0 && pct === 100
  const gradient = PLAN_GRADIENTS[index % PLAN_GRADIENTS.length]

  return (
    <div
      className={`plan-card animate-fade-in ${isComplete ? "celebrate-100" : ""}`}
      onClick={() => router.push(`/plans/${plan.id}`)}
      style={{ overflow: "hidden" }}
    >
      <div style={{ height: "6px", background: gradient, margin: "-1rem -1rem 0.75rem -1rem" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", flex: 1, marginRight: "0.5rem" }}>
          {plan.title}
        </h3>
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 700,
            fontFamily: "'Fredoka', sans-serif",
            color: isComplete ? "var(--success-dark)" : "var(--primary)",
            background: isComplete ? "var(--mint)" : "var(--primary-lighter)",
            borderRadius: "999px",
            padding: "0.2rem 0.625rem",
            flexShrink: 0,
          }}
        >
          {isComplete ? "🎉 ¡Listo!" : `${pct}%`}
        </span>
      </div>

      {plan.description && (
        <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          {plan.description}
        </p>
      )}

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.375rem" }}>
        <p style={{ fontSize: "0.75rem", color: isComplete ? "var(--primary)" : "var(--foreground-muted)", fontWeight: isComplete ? 700 : 400 }}>
          {total === 0 ? "Sin tareas" : isComplete ? "✨ ¡Plan completado!" : `${done} completada${done !== 1 ? "s" : ""}`}
        </p>
        {total > 0 && !isComplete && (
          <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>
            {total - done} pendiente{total - done !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  )
}
