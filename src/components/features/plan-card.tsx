"use client"

import { useRouter } from "next/navigation"
import type { Plan } from "@/types"

interface Props {
  plan: Plan
}

export function PlanCard({ plan }: Props) {
  const router = useRouter()
  const total = plan.task_count ?? 0
  const done = plan.completed_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete = total > 0 && pct === 100

  return (
    <div
      className={`plan-card animate-fade-in ${isComplete ? "celebrate-100" : ""}`}
      onClick={() => router.push(`/plans/${plan.id}`)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", flex: 1, marginRight: "0.5rem" }}>
          {plan.title}
        </h3>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: isComplete ? "var(--success-dark)" : "var(--foreground-muted)",
            background: isComplete ? "var(--mint)" : "var(--muted)",
            borderRadius: "999px",
            padding: "0.2rem 0.625rem",
            flexShrink: 0,
          }}
        >
          {isComplete ? "🎉 ¡Listo!" : `${done}/${total}`}
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
          {total === 0 ? "Sin tareas" : isComplete ? "✨ ¡Plan completado!" : `${pct}% completado`}
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
