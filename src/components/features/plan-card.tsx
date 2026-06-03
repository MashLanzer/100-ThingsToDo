"use client"

import { useRouter } from "next/navigation"
import { Share2, Sparkles, Calendar, AlertTriangle } from "lucide-react"
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

function dueDateBadge(dueDateStr: string): { text: string; color: string; icon: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateStr + "T00:00:00")
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { text: "Vencido", color: "#ef4444", icon: "warning" }
  if (days === 0) return { text: "¡Hoy!", color: "#f97316", icon: "calendar" }
  if (days <= 7) return { text: `${days}d`, color: "#f97316", icon: "calendar" }
  return { text: `${days} días`, color: "rgba(255,255,255,0.75)", icon: "calendar" }
}

function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  const colors = [
    { bg: "rgba(237,233,254,0.9)", text: "#7c3aed" },
    { bg: "rgba(252,231,243,0.9)", text: "#be185d" },
    { bg: "rgba(209,250,229,0.9)", text: "#065f46" },
    { bg: "rgba(219,234,254,0.9)", text: "#1d4ed8" },
    { bg: "rgba(254,243,199,0.9)", text: "#92400e" },
    { bg: "rgba(254,226,226,0.9)", text: "#991b1b" },
    { bg: "rgba(224,242,254,0.9)", text: "#0369a1" },
  ]
  return JSON.stringify(colors[Math.abs(hash) % colors.length])
}

// A2: Gradient based on tag keywords, falls back to index-based
const PLAN_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #06B6D4 0%, #10B981 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  "linear-gradient(135deg, #EC4899 0%, #A78BFA 100%)",
  "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
]

function tagBasedGradient(tags: string[], fallback: string): string {
  const s = tags.join(" ").toLowerCase()
  if (s.match(/viaje|travel|aventura|escapada|turismo|trip/))
    return "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)"
  if (s.match(/romántico|amor|pareja|love|beso|cita|romántica/))
    return "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)"
  if (s.match(/cocina|comida|food|cena|restaurante|receta|cocinar/))
    return "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)"
  if (s.match(/música|music|concierto|canción|playlist/))
    return "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)"
  if (s.match(/deporte|fitness|gym|correr|ejercicio|sport/))
    return "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
  if (s.match(/casa|hogar|deco|proyecto|compras/))
    return "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
  return fallback
}

interface Props {
  plan: Plan
  index?: number
  cardSize?: "compact" | "normal" | "large"
  isNew?: boolean
}

export function PlanCard({ plan, index = 0, cardSize = "normal", isNew = false }: Props) {
  const router = useRouter()
  const total = plan.task_count ?? 0
  const done = plan.completed_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete = total > 0 && pct === 100
  const fallbackGradient = PLAN_GRADIENTS[index % PLAN_GRADIENTS.length]
  const gradient = tagBasedGradient(plan.tags ?? [], fallbackGradient)

  const hasCover = !!plan.cover_image
  const tags = plan.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const extraTags = tags.length - visibleTags.length
  const dueInfo = plan.due_date ? dueDateBadge(plan.due_date) : null

  const coverHeight = cardSize === "compact" ? 120 : cardSize === "large" ? 260 : 200
  const gradientHeaderHeight = cardSize === "compact" ? 52 : cardSize === "large" ? 120 : 88
  const showDescription = cardSize !== "compact"

  // A3: staggered entrance delay
  const animDelay = `${index * 70}ms`

  return (
    <div
      className={`plan-card ${isComplete ? "celebrate-100" : ""}`}
      onClick={() => router.push(`/plans/${plan.id}`)}
      style={{
        overflow: "hidden",
        padding: 0,
        animation: isNew
          ? "cardNewBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both"
          : "cardSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        animationDelay: isNew ? "0ms" : animDelay,
      }}
    >
      {hasCover ? (
        // ── A1: FULL-COVER CARD ──────────────────────────────────────────────
        <div style={{ position: "relative", minHeight: coverHeight }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={plan.cover_image!}
            alt=""
            style={{ width: "100%", height: coverHeight, objectFit: "cover", display: "block" }}
          />
          {/* Gradient overlay — stronger at bottom */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.82) 100%)",
          }} />

          {/* Progress badge — top right */}
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              fontSize: "0.875rem", fontWeight: 800, fontFamily: "'Fredoka', sans-serif",
              color: "white",
              background: isComplete ? "rgba(16,185,129,0.85)" : total === 0 ? "rgba(0,0,0,0.45)" : "rgba(139,92,246,0.85)",
              backdropFilter: "blur(6px)",
              borderRadius: "999px", padding: "4px 10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}>
              {isComplete ? <><Sparkles size={13} /> ¡Listo!</> : `${pct}%`}
            </span>
          </div>

          {/* "Nuevo" badge */}
          {plan.updated_at && plan.updated_at !== plan.created_at &&
            (Date.now() - new Date(plan.updated_at).getTime()) < 86_400_000 && (
            <div style={{ position: "absolute", top: 10, left: 44 }}>
              <span style={{
                fontSize: "0.5625rem", fontWeight: 700,
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                color: "white", borderRadius: "999px", padding: "3px 8px",
              }}>Nuevo</span>
            </div>
          )}

          {/* Content overlay at bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0.75rem 0.875rem 0.875rem" }}>
            <h3 style={{
              fontWeight: 700, fontSize: "1rem",
              fontFamily: "'Fredoka', sans-serif",
              color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              marginBottom: "0.375rem",
              lineHeight: 1.25,
            }}>
              {plan.title}
            </h3>

            {/* Tags + due date row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {dueInfo && (
                <span style={{
                  fontSize: "0.5625rem", fontWeight: 700, color: dueInfo.color,
                  background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
                  borderRadius: "999px", padding: "2px 7px",
                  display: "inline-flex", alignItems: "center", gap: "2px",
                }}>
                  {dueInfo.icon === "warning" ? <AlertTriangle size={9} /> : <Calendar size={9} />}
                  {dueInfo.text}
                </span>
              )}
              {visibleTags.map((tag) => (
                <span key={tag} style={{
                  fontSize: "0.5625rem", fontWeight: 700, color: "white",
                  background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
                  borderRadius: "999px", padding: "2px 7px",
                }}>
                  {tag}
                </span>
              ))}
              {extraTags > 0 && (
                <span style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.7)" }}>+{extraTags}</span>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: "4px", background: "rgba(255,255,255,0.25)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: isComplete ? "#10b981" : "linear-gradient(90deg, #a78bfa, #f9a8d4)",
                borderRadius: "999px",
                transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
              }} />
            </div>
            <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
              {total === 0 ? "Sin tareas" : `${done} de ${total} ${isComplete ? "✓ ¡Listo!" : ""}`}
            </p>
          </div>
        </div>
      ) : (
        // ── A2: GRADIENT HEADER CARD ─────────────────────────────────────────
        <>
          {/* Gradient header — taller, title overlaid */}
          <div style={{ position: "relative", height: gradientHeaderHeight, background: gradient, overflow: "hidden" }}>
            {/* Decorative circles */}
            <div style={{
              position: "absolute", top: -18, right: -18,
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
            }} />
            <div style={{
              position: "absolute", bottom: -10, left: -10,
              width: 50, height: 50, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }} />

            {/* Progress badge */}
            <div style={{ position: "absolute", top: 10, right: 10 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px",
                fontSize: "0.875rem", fontWeight: 800, fontFamily: "'Fredoka', sans-serif",
                color: "white",
                background: "rgba(255,255,255,0.22)",
                backdropFilter: "blur(4px)",
                borderRadius: "999px", padding: "3px 10px",
              }}>
                {isComplete ? <><Sparkles size={13} /> ¡Listo!</> : total === 0 ? "—" : `${pct}%`}
              </span>
            </div>

            {/* "Nuevo" */}
            {plan.updated_at && plan.updated_at !== plan.created_at &&
              (Date.now() - new Date(plan.updated_at).getTime()) < 86_400_000 && (
              <div style={{ position: "absolute", top: 10, left: 44 }}>
                <span style={{
                  fontSize: "0.5rem", fontWeight: 700,
                  background: "rgba(255,255,255,0.9)",
                  color: "var(--primary)", borderRadius: "999px", padding: "2px 7px",
                }}>Nuevo</span>
              </div>
            )}

            {/* Title in overlay at bottom of gradient */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "0.25rem 0.875rem 0.5rem",
            }}>
              <h3 style={{
                fontWeight: 700, fontSize: "0.9375rem",
                fontFamily: "'Fredoka', sans-serif",
                color: "white",
                textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                lineHeight: 1.2,
              }}>
                {plan.title}
              </h3>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "0.75rem 0.875rem 0.875rem" }}>
            {showDescription && plan.description && (
              <p style={{
                fontSize: "0.8125rem", color: "var(--foreground-muted)",
                marginBottom: "0.625rem", lineHeight: 1.5,
                display: "-webkit-box", WebkitLineClamp: cardSize === "large" ? 4 : 2,
                WebkitBoxOrient: "vertical" as const, overflow: "hidden",
              }}>
                {plan.description}
              </p>
            )}

            {/* Due date */}
            {dueInfo && (
              <div style={{ marginBottom: "0.5rem" }}>
                <span style={{
                  fontSize: "0.625rem", fontWeight: 700, color: dueInfo.color,
                  background: `${dueInfo.color}18`, borderRadius: "999px", padding: "2px 7px",
                  display: "inline-flex", alignItems: "center", gap: "2px",
                }}>
                  {dueInfo.icon === "warning" ? <AlertTriangle size={9} /> : <Calendar size={9} />}
                  {dueInfo.text}
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div className="progress-bar-track" style={total === 0 ? { opacity: 0.4 } : undefined}>
              <div className="progress-bar-fill" style={{ width: `${pct}%`, background: total === 0 ? "var(--border)" : undefined }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.375rem" }}>
              <p style={{ fontSize: "0.75rem", color: total === 0 ? "var(--foreground-muted)" : isComplete ? "var(--primary)" : "var(--foreground-muted)", fontWeight: isComplete ? 700 : 400 }}>
                {total === 0
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--foreground-muted)", fontStyle: "italic" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      Sin tareas aún
                    </span>
                  : isComplete ? <><Sparkles size={12} /> ¡Plan completado!</> : `${done}/${total} completadas`}
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
                    <span key={tag} style={{
                      fontSize: "0.5625rem", fontWeight: 700,
                      background: colors.bg, color: colors.text,
                      borderRadius: "999px", padding: "0.125rem 0.5rem",
                    }}>
                      {tag}
                    </span>
                  )
                })}
                {extraTags > 0 && (
                  <span style={{
                    fontSize: "0.5625rem", fontWeight: 700,
                    background: "var(--muted)", color: "var(--foreground-muted)",
                    borderRadius: "999px", padding: "0.125rem 0.5rem",
                  }}>
                    +{extraTags}
                  </span>
                )}
              </div>
            )}

            {/* Share button */}
            {isComplete && total > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const text = `¡Lo logramos!\nPlan completado: ${plan.title}\n${total} cosa${total !== 1 ? "s" : ""} que hicimos juntos`
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({ text }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText(text).then(() => toast.success("¡Copiado! 💕")).catch(() => toast.error("No se pudo copiar"))
                  }
                }}
                style={{
                  marginTop: "0.5rem",
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  padding: "0.25rem 0.75rem", borderRadius: "999px",
                  border: "1.5px solid var(--secondary)", background: "transparent",
                  color: "var(--secondary)", fontSize: "0.6875rem", fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer", transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--secondary)"; e.currentTarget.style.color = "white" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--secondary)" }}
              >
                <Share2 size={12} /> Compartir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
