"use client"

import { useRouter } from "next/navigation"
import { Share2 } from "lucide-react"
import { toast } from "sonner"
import type { Plan } from "@/types"

function relativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "hoy"
  if (diff === 1) return "ayer"
  if (diff < 30) return `hace ${diff} días`
  if (diff < 365) return `hace ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? "es" : ""}`
  return `hace ${Math.floor(diff / 365)} año${Math.floor(diff / 365) > 1 ? "s" : ""}`
}

function dueDateBadge(dueDateStr: string): { text: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr + "T00:00:00")
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { text: "⚠️ Vencido", color: "#ef4444" }
  if (days === 0) return { text: "🔥 ¡Hoy!", color: "#f97316" }
  if (days <= 7) return { text: `📅 ${days} día${days !== 1 ? "s" : ""}`, color: "#f97316" }
  return { text: `📅 ${days} días`, color: "var(--foreground-muted)" }
}

function tagColor(tag: string): string {
  // Deterministic color from tag hash
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  const colors = [
    { bg: "#ede9fe", text: "#7c3aed" },
    { bg: "#fce7f3", text: "#be185d" },
    { bg: "#d1fae5", text: "#065f46" },
    { bg: "#dbeafe", text: "#1d4ed8" },
    { bg: "#fef3c7", text: "#92400e" },
    { bg: "#fee2e2", text: "#991b1b" },
    { bg: "#e0f2fe", text: "#0369a1" },
    { bg: "#f3e8ff", text: "#7e22ce" },
  ]
  return JSON.stringify(colors[Math.abs(hash) % colors.length])
}

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

  const hasCover = !!plan.cover_image
  const tags = plan.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const extraTags = tags.length - visibleTags.length

  const dueInfo = plan.due_date ? dueDateBadge(plan.due_date) : null

  return (
    <div
      className={`plan-card animate-fade-in ${isComplete ? "celebrate-100" : ""}`}
      onClick={() => router.push(`/plans/${plan.id}`)}
      style={{ overflow: "hidden", padding: 0 }}
    >
      {/* Cover image or gradient strip */}
      {hasCover ? (
        <div style={{ position: "relative", height: "100px", margin: 0, overflow: "hidden", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={plan.cover_image!}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* gradient overlay so text is readable if needed */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.35) 100%)" }} />
        </div>
      ) : (
        <div style={{ height: "6px", background: gradient, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
      )}

      {/* Card body */}
      <div style={{ padding: "0.875rem 1rem 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.375rem" }}>
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

        {/* Due date badge */}
        {dueInfo && (
          <div style={{ marginBottom: "0.375rem" }}>
            <span
              style={{
                fontSize: "0.625rem",
                fontWeight: 700,
                color: dueInfo.color,
                background: `${dueInfo.color}18`,
                borderRadius: "999px",
                padding: "0.125rem 0.5rem",
                display: "inline-block",
              }}
            >
              {dueInfo.text}
            </span>
          </div>
        )}

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
          <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", opacity: 0.7 }}>
            {relativeDate(plan.created_at)}
          </p>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
            {visibleTags.map((tag) => {
              const colors = JSON.parse(tagColor(tag)) as { bg: string; text: string }
              return (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    background: colors.bg,
                    color: colors.text,
                    borderRadius: "999px",
                    padding: "0.125rem 0.4375rem",
                  }}
                >
                  {tag}
                </span>
              )
            })}
            {extraTags > 0 && (
              <span
                style={{
                  fontSize: "0.5625rem",
                  fontWeight: 700,
                  background: "var(--muted)",
                  color: "var(--foreground-muted)",
                  borderRadius: "999px",
                  padding: "0.125rem 0.4375rem",
                }}
              >
                +{extraTags}
              </span>
            )}
          </div>
        )}

        {/* Share button — only when 100% complete */}
        {isComplete && total > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const text = `💕 ¡Lo logramos! 💕\n✅ Plan completado: ${plan.title}\n📝 ${total} cosa${total !== 1 ? "s" : ""} que hicimos juntos\n🎊 ThingsToDo Kawaii Edition`
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator.share({ text }).catch(() => {/* user cancelled */})
              } else {
                navigator.clipboard.writeText(text).then(() => {
                  toast.success("¡Enlace copiado! 💕")
                }).catch(() => {
                  toast.error("No se pudo copiar")
                })
              }
            }}
            style={{
              marginTop: "0.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              border: "1.5px solid var(--secondary)",
              background: "transparent",
              color: "var(--secondary)",
              fontSize: "0.6875rem",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--secondary)"
              e.currentTarget.style.color = "white"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--secondary)"
            }}
          >
            <Share2 size={12} />
            Compartir 🎉
          </button>
        )}
      </div>
    </div>
  )
}
