"use client"

import { useState } from "react"
import type { Plan } from "@/types"

interface Props {
  plans: Plan[]
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function planDotColor(plan: Plan): string {
  const total = plan.task_count ?? 0
  const done = plan.completed_count ?? 0
  const pct = total > 0 ? (done / total) * 100 : 0
  if (total > 0 && pct === 100) return "#10b981" // green: complete

  // Check overdue
  if (plan.due_date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(plan.due_date + "T00:00:00")
    if (due < today) return "#ef4444" // red: overdue
  }

  return "var(--primary)" // purple: active
}

function progressPct(plan: Plan): number {
  const total = plan.task_count ?? 0
  const done = plan.completed_count ?? 0
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function PlanCalendar({ plans }: Props) {
  const now = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Only plans that have a due_date
  const plansWithDue = plans.filter((p) => !!p.due_date)

  // Build a map: dateStr -> Plan[]
  const plansByDate = new Map<string, Plan[]>()
  for (const plan of plansWithDue) {
    const key = plan.due_date!
    const existing = plansByDate.get(key) ?? []
    existing.push(plan)
    plansByDate.set(key, existing)
  }

  const monthLabel = `${currentDate.toLocaleString("es-ES", { month: "long" })} ${year}`
  const weekDays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]

  // Calculate first day offset (Mon-based)
  const rawFirstDay = new Date(year, month, 1).getDay() // 0=Sun
  const firstDay = (rawFirstDay + 6) % 7 // Mon=0 ... Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayStr = toLocalDateStr(now)

  const selectedPlans = selectedDate ? (plansByDate.get(selectedDate) ?? []) : []

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null) }}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            cursor: "pointer", padding: "0.375rem 0.75rem", fontSize: "1rem", lineHeight: 1,
            color: "var(--foreground-light)", fontWeight: 700,
          }}
        >
          ‹
        </button>
        <span style={{
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700,
          fontSize: "1rem", color: "var(--foreground)", textTransform: "capitalize",
        }}>
          {monthLabel}
        </span>
        <button
          onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null) }}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            cursor: "pointer", padding: "0.375rem 0.75rem", fontSize: "1rem", lineHeight: 1,
            color: "var(--foreground-light)", fontWeight: 700, transform: "rotate(180deg)",
          }}
        >
          ‹
        </button>
      </div>

      {/* Week day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
        {weekDays.map((d) => (
          <div key={d} style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", padding: "0.25rem 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {/* Leading empty cells */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dayPlans = plansByDate.get(dateStr) ?? []
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const hasPlans = dayPlans.length > 0
          // Show up to 2 dots
          const dotsToShow = dayPlans.slice(0, 2)

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                aspectRatio: "1",
                borderRadius: "10px",
                border: isSelected
                  ? "2px solid var(--primary)"
                  : isToday
                  ? "2px solid var(--primary)"
                  : hasPlans
                  ? "1.5px solid var(--primary-light)"
                  : "1px solid var(--border)",
                background: isSelected
                  ? "var(--primary)"
                  : isToday
                  ? "var(--primary-lighter)"
                  : hasPlans
                  ? "linear-gradient(135deg, var(--primary-lighter) 0%, white 100%)"
                  : "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6875rem",
                fontWeight: isToday || hasPlans ? 700 : 400,
                color: isSelected ? "white" : isToday ? "var(--primary)" : hasPlans ? "var(--foreground)" : "var(--foreground-muted)",
                gap: "2px",
                padding: "3px 2px",
                boxShadow: isToday ? "0 2px 8px rgba(139,92,246,0.2)" : isSelected ? "0 2px 10px rgba(139,92,246,0.35)" : "none",
                transition: "transform 0.1s",
              }}
            >
              <span style={{ lineHeight: 1 }}>{day}</span>
              {dotsToShow.length > 0 && (
                <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                  {dotsToShow.map((plan, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: isSelected ? "white" : planDotColor(plan),
                        flexShrink: 0,
                      }}
                    />
                  ))}
                  {dayPlans.length > 2 && (
                    <span style={{ fontSize: "0.4375rem", fontWeight: 700, color: isSelected ? "white" : "var(--foreground-muted)", lineHeight: 1 }}>
                      +{dayPlans.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
        {[
          { color: "var(--primary)", label: "Activo" },
          { color: "#10b981", label: "Completado" },
          { color: "#ef4444", label: "Vencido" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Selected day plans */}
      {selectedDate && (
        <div className="animate-fade-in" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)",
            marginBottom: "0.5rem", textTransform: "capitalize",
          }}>
            📅 {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </p>

          {selectedPlans.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", textAlign: "center", padding: "0.75rem 0" }}>
              Sin planes para este día 🌸
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {selectedPlans.map((plan) => {
                const pct = progressPct(plan)
                const isComplete = (plan.task_count ?? 0) > 0 && pct === 100
                const dotColor = planDotColor(plan)
                return (
                  <div
                    key={plan.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.625rem",
                      background: isComplete ? "var(--mint, #d1fae5)" : "var(--primary-lighter)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.625rem 0.75rem",
                      border: `1px solid ${isComplete ? "#6ee7b7" : "var(--primary-light)"}`,
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "0.8125rem", fontWeight: 700,
                        color: "var(--foreground)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {plan.title}
                      </p>
                      <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "1px" }}>
                        {(plan.task_count ?? 0) === 0
                          ? "Sin tareas"
                          : isComplete
                          ? "✨ ¡Completado!"
                          : `${plan.completed_count ?? 0}/${plan.task_count ?? 0} tareas`}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      fontFamily: "'Fredoka', sans-serif",
                      color: isComplete ? "#065f46" : "var(--primary)",
                      background: isComplete ? "#a7f3d0" : "white",
                      borderRadius: "999px",
                      padding: "0.125rem 0.5rem",
                      flexShrink: 0,
                    }}>
                      {isComplete ? "🎉 100%" : `${pct}%`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* No plans with due dates message */}
      {plansWithDue.length === 0 && (
        <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--foreground-muted)" }}>
          <div style={{ fontSize: "1.75rem", marginBottom: "0.375rem" }}>📅</div>
          <p style={{ fontSize: "0.8125rem" }}>Ningún plan tiene fecha objetivo aún</p>
          <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.7 }}>Edita un plan para añadir una fecha</p>
        </div>
      )}
    </div>
  )
}
