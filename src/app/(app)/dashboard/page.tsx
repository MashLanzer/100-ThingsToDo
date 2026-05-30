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
import { OnboardingModal } from "@/components/shared/onboarding-modal"
import { PlanCalendar } from "@/components/features/plan-calendar"

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

type SortBy = "newest" | "oldest" | "progress_asc" | "progress_desc"

function sortPlans(plans: Plan[], sortBy: SortBy): Plan[] {
  return [...plans].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    const progressA = (a.task_count ?? 0) > 0 ? (a.completed_count ?? 0) / (a.task_count ?? 1) : 0
    const progressB = (b.task_count ?? 0) > 0 ? (b.completed_count ?? 0) / (b.task_count ?? 1) : 0
    if (sortBy === "progress_desc") return progressB - progressA
    if (sortBy === "progress_asc") return progressA - progressB
    return 0
  })
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
  const [newCoverImage, setNewCoverImage] = useState("")
  const [newDueDate, setNewDueDate] = useState("")
  const [newTagInput, setNewTagInput] = useState("")
  const [newTags, setNewTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [showArchived, setShowArchived] = useState(false)
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid")
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem("ttd_onboarding_done_v1")
  })

  const hasCouple = !!coupleData?.couple

  // Restore scroll position on mount, save on unmount
  useEffect(() => {
    const saved = sessionStorage.getItem("ttd_scroll_dashboard")
    if (saved) window.scrollTo(0, parseInt(saved, 10))
    return () => {
      sessionStorage.setItem("ttd_scroll_dashboard", String(window.scrollY))
    }
  }, [])

  const allPlans = plans ?? []

  // Split into active and archived
  const activePlans = allPlans.filter((p) => !p.archived)
  const archivedPlans = allPlans.filter((p) => p.archived)

  // Collect all unique tags from all plans
  const allTags = Array.from(new Set(allPlans.flatMap((p) => p.tags ?? []))).sort()

  // Apply search + tag filter
  const filterFn = (p: Plan) => {
    if (activeTagFilter && !(p.tags ?? []).includes(activeTagFilter)) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
  }

  const filteredActive = sortPlans(activePlans.filter(filterFn), sortBy)
  const filteredArchived = sortPlans(archivedPlans.filter(filterFn), sortBy)

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
      await createPlan.mutateAsync({
        title: title.trim(),
        description: desc.trim() || undefined,
        cover_image: newCoverImage.trim() || undefined,
        due_date: newDueDate || undefined,
        tags: newTags.length > 0 ? newTags : undefined,
      })
      setTitle("")
      setDesc("")
      setNewCoverImage("")
      setNewDueDate("")
      setNewTags([])
      setNewTagInput("")
      setShowForm(false)
      toast.success("Plan creado 🎉")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear plan")
    }
  }

  function handleAddNewTag() {
    const tag = newTagInput.trim()
    if (tag && !newTags.includes(tag)) setNewTags((prev) => [...prev, tag])
    setNewTagInput("")
  }

  const hasAnyPlans = allPlans.length > 0
  const noResults = searchQuery.trim() && filteredActive.length === 0 && filteredArchived.length === 0

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

      {/* Search bar */}
      {hasAnyPlans && allPlans.length > 2 && (
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

      {/* Tag filter pills */}
      {hasAnyPlans && allTags.length > 0 && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <button
            onClick={() => setActiveTagFilter(null)}
            style={{
              padding: "3px 10px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.6875rem",
              fontWeight: 600,
              background: activeTagFilter === null ? "var(--secondary)" : "var(--muted)",
              color: activeTagFilter === null ? "white" : "var(--foreground-muted)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            🏷️ Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
              style={{
                padding: "3px 10px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "0.6875rem",
                fontWeight: 600,
                background: activeTagFilter === tag ? "var(--primary)" : "var(--muted)",
                color: activeTagFilter === tag ? "white" : "var(--foreground-muted)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Sort pills + view toggle */}
      {hasAnyPlans && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.875rem", alignItems: "center" }}>
          {([
            { key: "newest", label: "🕐 Recientes" },
            { key: "oldest", label: "🕐 Antiguos" },
            { key: "progress_desc", label: "📈 Más progreso" },
            { key: "progress_asc", label: "📉 Menos progreso" },
          ] as { key: SortBy; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                padding: "3px 10px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "0.6875rem",
                fontWeight: 600,
                background: sortBy === key ? "var(--primary)" : "var(--muted)",
                color: sortBy === key ? "white" : "var(--foreground-muted)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
          {/* View mode toggle — icon buttons at the far right */}
          <div style={{ marginLeft: "auto", display: "flex", borderRadius: "999px", border: "1px solid var(--border)", overflow: "hidden" }}>
            {([
              { key: "grid", icon: "▦", title: "Vista planes" },
              { key: "calendar", icon: "📅", title: "Vista calendario" },
            ] as { key: "grid" | "calendar"; icon: string; title: string }[]).map(({ key, icon, title }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                title={title}
                style={{
                  padding: "4px 10px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.75rem",
                  background: viewMode === key ? "var(--primary)" : "var(--muted)",
                  color: viewMode === key ? "white" : "var(--foreground-muted)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {icon}
              </button>
            ))}
          </div>
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
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "block", marginBottom: "0.25rem" }}>
                🖼️ URL de portada (opcional)
              </label>
              <input
                className="input"
                type="url"
                placeholder="https://..."
                value={newCoverImage}
                onChange={(e) => setNewCoverImage(e.target.value)}
              />
              {newCoverImage.trim() && (
                <div style={{ marginTop: "0.375rem", borderRadius: "var(--radius-md)", overflow: "hidden", height: "60px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newCoverImage.trim()} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "block", marginBottom: "0.25rem" }}>
                📅 Fecha objetivo (opcional)
              </label>
              <input
                className="input"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "block", marginBottom: "0.25rem" }}>
                🏷️ Etiquetas
              </label>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Ej: Viajes, Romántico..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewTag() } }}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-outline" type="button" onClick={handleAddNewTag} style={{ flexShrink: 0, fontSize: "0.75rem" }}>
                  +
                </button>
              </div>
              {newTags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.375rem" }}>
                  {newTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.25rem",
                        fontSize: "0.6875rem", fontWeight: 600,
                        background: "var(--primary-lighter)", color: "var(--primary)",
                        borderRadius: "999px", padding: "0.125rem 0.5rem",
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setNewTags((prev) => prev.filter((t) => t !== tag))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "var(--primary)", fontWeight: 700, fontSize: "0.75rem" }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreate} disabled={createPlan.isPending}>
                {createPlan.isPending ? "Creando..." : "Crear"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {viewMode === "calendar" && !isLoading && (
        <div className="card animate-fade-in">
          <PlanCalendar plans={allPlans} />
        </div>
      )}

      {/* Plans grid */}
      {viewMode === "grid" && (
        isLoading ? (
          <div className="empty-state">
            <svg className="animate-heartbeat" width="40" height="40" viewBox="0 0 24 24" fill="#8B5CF6">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        ) : !hasAnyPlans || noResults ? (
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
          <>
            {/* Active plans */}
            {filteredActive.length > 0 && (
              <div className="plans-grid">
                {filteredActive.map((plan, i) => (
                  <SwipePlanCard key={plan.id} plan={plan} index={i} onDelete={() => handleDeletePlan(plan.id)} />
                ))}
              </div>
            )}

            {/* Archived / completed section */}
            {filteredArchived.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
                    background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                    padding: "0.5rem 0.75rem", cursor: "pointer", fontFamily: "inherit",
                    fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground-light)",
                    marginBottom: showArchived ? "0.75rem" : 0,
                  }}
                >
                  <span>✅ Completados</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                    {filteredArchived.length} {showArchived ? "▲" : "▼"}
                  </span>
                </button>
                {showArchived && (
                  <div className="plans-grid animate-fade-in">
                    {filteredArchived.map((plan, i) => (
                      <SwipePlanCard key={plan.id} plan={plan} index={i} onDelete={() => handleDeletePlan(plan.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* If no active plans but only archived */}
            {filteredActive.length === 0 && filteredArchived.length === 0 && searchQuery.trim() && (
              <div className="empty-state">
                <div className="empty-icon animate-bounce-slow">🔍</div>
                <p className="empty-text">No hay planes que coincidan con tu búsqueda</p>
              </div>
            )}
          </>
        )
      )}
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
    </div>
  )
}
