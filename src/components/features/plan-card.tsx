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

  return (
    <div className="plan-card animate-fade-in" onClick={() => router.push(`/plans/${plan.id}`)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", flex: 1, marginRight: "0.5rem" }}>
          {plan.title}
        </h3>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: pct === 100 ? "var(--success-dark)" : "var(--foreground-muted)",
            background: pct === 100 ? "var(--mint)" : "var(--muted)",
            borderRadius: "999px",
            padding: "0.125rem 0.5rem",
            flexShrink: 0,
          }}
        >
          {pct === 100 ? "✅ Listo" : `${done}/${total}`}
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

      <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "0.5rem" }}>
        {total === 0 ? "Sin tareas" : `${pct}% completado`}
      </p>
    </div>
  )
}
