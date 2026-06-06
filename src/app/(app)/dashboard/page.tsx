"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePlans, useCreatePlan } from "@/hooks/use-plans"
import { useCoupleStatus } from "@/hooks/use-couple"
import { useAuth } from "@/hooks/use-auth"
import { PlanCard } from "@/components/features/plan-card"
import { useAppStore } from "@/stores/app-store"
import { useWindowPTR } from "@/hooks/use-window-ptr"
import { Plus, X, Trash2, Search, GripVertical, Tag, ImagePlus, Calendar, Heart, Mail, CheckCircle2, ClipboardList, ChevronDown, Loader2, LayoutGrid, Rows3 } from "lucide-react"
import { toast } from "sonner"
import { getFirebaseToken } from "@/lib/firebase/client"
import { showConfirm } from "@/lib/confirm"
import { daysTogether, daysUntilAnniversary } from "@/lib/utils"
import type { Plan } from "@/types"
import { OnboardingModal } from "@/components/shared/onboarding-modal"
import { PlanCalendar } from "@/components/features/plan-calendar"
import { Modal } from "@/components/ui/modal"
import { useDarkMode } from "@/hooks/use-dark-mode"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const CURRENT_VERSION = "5.0"
const WHATS_NEW = [
  "✏️ Editar pistas en la app de música",
  "⏳ Fechas límite en metas de ahorro",
  "📷 Ver fotos de tareas a pantalla completa",
  "✅ Completar todas las tareas del plan de una vez",
]

function SwipePlanCard({ plan, index, onDelete, cardSize, isNew, currentUserId }: { plan: Plan; index: number; onDelete: () => void; cardSize?: "compact" | "normal" | "large"; isNew?: boolean; currentUserId?: string }) {
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number>(0)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id })

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
    <div
      ref={setNodeRef}
      style={{
        position: "relative",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
        marginBottom: "0.75rem",
      }}
    >
      {/* Red delete panel behind */}
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
      {/* Drag handle — top-left corner */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: "absolute", top: "8px", left: "8px", zIndex: 20,
          cursor: "grab", touchAction: "none", padding: "4px",
          background: "rgba(255,255,255,0.85)", borderRadius: "6px",
          display: "flex", alignItems: "center", color: "#888",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
        title="Arrastrar para reordenar"
      >
        <GripVertical size={14} />
      </div>
      {/* Sliding content */}
      <div
        style={{ transform: `translateX(${swipeX}px)`, transition: isSwiping ? "none" : "transform 0.25s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <PlanCard plan={plan} index={index} cardSize={cardSize} isNew={isNew} currentUserId={currentUserId} />
      </div>
    </div>
  )
}

// F1: Plan templates
const PLAN_TEMPLATES = [
  { emoji: "✈️", title: "Viaje de pareja", desc: "Escapada y nueva aventura juntos", tags: ["Viajes"], tasks: ["Buscar vuelos y fechas", "Reservar alojamiento", "Hacer las maletas", "Crear itinerario", "Cambiar divisas", "Contratar seguro de viaje"] },
  { emoji: "🍽️", title: "Cena especial", desc: "Una noche para recordar", tags: ["Romántico"], tasks: ["Elegir restaurante", "Hacer la reserva", "Preparar el look", "Llegar a tiempo", "Pedir el postre especial"] },
  { emoji: "🛋️", title: "Fin de semana en casa", desc: "Tiempo de calidad sin salir", tags: ["Casa"], tasks: ["Comprar snacks ricos", "Elegir películas", "Preparar manta y cojines", "Cocinar algo especial", "Apagar notificaciones"] },
  { emoji: "💑", title: "Plan de citas", desc: "Sorpresas y momentos bonitos", tags: ["Romántico"], tasks: ["Buscar un sitio nuevo", "Pasear juntos", "Helado de postre", "Foto juntos", "Planear la próxima cita"] },
  { emoji: "🏞️", title: "Aventura al aire libre", desc: "Naturaleza y desconexión total", tags: ["Aventura"], tasks: ["Revisar el tiempo", "Preparar la mochila", "Descargar mapas offline", "Llevar snacks y agua", "Salida a primera hora"] },
  { emoji: "🎲", title: "Noche de juegos", desc: "Diversión en casa sin pantallas", tags: ["Casa"], tasks: ["Elegir juegos de mesa", "Preparar aperitivos", "Poner música de fondo", "Preparar premios divertidos", "Prohibido hacer trampa 😄"] },
] as const

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

const ES_DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const ES_MONTHS_FULL = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
const MONTH_GRADIENTS = [
  "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  "linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)",
  "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
  "linear-gradient(135deg, #059669 0%, #0EA5E9 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
  "linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)",
  "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #F43F5E 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)",
]

interface ActivityEvent {
  id: string
  type: "task_complete" | "plan_created" | "favor_complete" | "journal_entry" | "photo_upload"
  description: string
  created_at: string
}

function activityEmoji(type: ActivityEvent["type"]): string {
  switch (type) {
    case "task_complete": return "✅"
    case "plan_created": return "📋"
    case "favor_complete": return "💝"
    case "journal_entry": return "📝"
    case "photo_upload": return "📸"
    default: return "💫"
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: plans, isLoading, refetch } = usePlans()
  const { data: coupleData } = useCoupleStatus()
  const { user } = useAuth()
  const createPlan = useCreatePlan()
  const { openCoupleModal, openPhoneModal } = useAppStore()
  const partnerNickname = useAppStore((s) => s.partnerNickname)
  const cardSize = useAppStore((s) => s.cardSize)
  const ptr = useWindowPTR(() => { refetch() })
  const isDark = useDarkMode()
  const T = {
    bg:        isDark ? "#1a1225"  : "var(--background)",
    surface:   isDark ? "#221833"  : "var(--surface)",
    border:    isDark ? "#4a3465" : "var(--border)",
    text:      isDark ? "#f0e8ff" : "var(--foreground)",
    textMuted: isDark ? "#9080a8" : "var(--foreground-muted)",
    muted:     isDark ? "#2a1e3a" : "var(--muted)",
    inputBg:   isDark ? "#2e2244" : "var(--muted)",
  }

  // D-A: partner activity feed
  const [partnerActivities, setPartnerActivities] = useState<ActivityEvent[]>([])

  const fetchPartnerActivity = useCallback(async () => {
    try {
      const token = await getFirebaseToken()
      if (!token) return
      const res = await fetch("/api/activity/partner", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      if (Array.isArray(json.events)) setPartnerActivities(json.events)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchPartnerActivity()
    const id = setInterval(fetchPartnerActivity, 60_000)
    return () => clearInterval(id)
  }, [fetchPartnerActivity])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const coverInputRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [newCoverImage, setNewCoverImage] = useState("")
  const [coverUploading, setCoverUploading] = useState(false)
  const [newDueDate, setNewDueDate] = useState("")
  const [newTagInput, setNewTagInput] = useState("")
  const [newTags, setNewTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [showArchived, setShowArchived] = useState(false)
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid")
  const [localPlanOrder, setLocalPlanOrder] = useState<string[] | null>(null)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem("ttd_onboarding_done_v1")
  })
  const [listView, setListView] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("ttd_plans_listview") === "1"
    return false
  })
  const [templateTasks, setTemplateTasks] = useState<string[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  // Hero stories slider
  const [heroSlide, setHeroSlide] = useState(0)
  const heroTouchStartX = useRef(0)
  // Scroll collapse
  const [isScrolled, setIsScrolled] = useState(false)

  const hasCouple = !!coupleData?.couple

  const [showWhatsNew, setShowWhatsNew] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("ttd_seen_v") !== CURRENT_VERSION
  })

  // Close sort menu when clicking outside
  useEffect(() => {
    if (!showSortMenu) return
    function handle(e: MouseEvent | TouchEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener("mousedown", handle)
    document.addEventListener("touchstart", handle)
    return () => {
      document.removeEventListener("mousedown", handle)
      document.removeEventListener("touchstart", handle)
    }
  }, [showSortMenu])

  useEffect(() => {
    localStorage.setItem("ttd_plans_listview", listView ? "1" : "0")
  }, [listView])

  // Restore scroll position on mount, save on unmount
  useEffect(() => {
    const saved = sessionStorage.getItem("ttd_scroll_dashboard")
    if (saved) window.scrollTo(0, parseInt(saved, 10))
    return () => {
      sessionStorage.setItem("ttd_scroll_dashboard", String(window.scrollY))
    }
  }, [])

  // Scroll-collapse listener
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 140)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const allPlans = Array.isArray(plans) ? plans : []

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

  // Apply manual drag order on top of sort
  const orderedActive = localPlanOrder
    ? [...filteredActive].sort((a, b) => {
        const ai = localPlanOrder.indexOf(a.id)
        const bi = localPlanOrder.indexOf(b.id)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : filteredActive

  const inProgressPlans = orderedActive.filter(
    (p) => !(p.task_count && p.task_count > 0 && p.completed_count === p.task_count)
  )
  const completedActivePlans = orderedActive.filter(
    (p) => !!(p.task_count && p.task_count > 0 && p.completed_count === p.task_count)
  )
  const allCompletedPlans = [...completedActivePlans, ...filteredArchived]
  const totalInProgress = activePlans.filter(
    (p) => !(p.task_count && p.task_count > 0 && p.completed_count === p.task_count)
  ).length
  const totalCompleted = activePlans.filter(
    (p) => !!(p.task_count && p.task_count > 0 && p.completed_count === p.task_count)
  ).length

  function handlePlanDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const current = localPlanOrder ?? filteredActive.map((p) => p.id)
    const oldIndex = current.indexOf(active.id as string)
    const newIndex = current.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    setLocalPlanOrder(arrayMove(current, oldIndex, newIndex))
  }

  async function handleDeletePlan(id: string) {
    if (!await showConfirm({ title: "Eliminar plan", message: "Se borrarán el plan y todas sus tareas. Esta acción no se puede deshacer.", danger: true })) return
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/plans/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } })
      if (!res.ok) throw new Error("Error")
      toast.success("Plan eliminado 🗑")
      refetch()
    } catch { toast.error("Error al eliminar") }
  }

  async function handleCoverUpload(file: File) {
    setCoverUploading(true)
    try {
      const token = await getFirebaseToken()
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/cover", { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` }, body: fd })
      if (!res.ok) throw new Error("Error")
      const data = await res.json()
      setNewCoverImage(data.url)
    } catch {
      toast.error("Error al subir la imagen")
    } finally {
      setCoverUploading(false)
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("El título no puede estar vacío")
      return
    }
    try {
      const created = await createPlan.mutateAsync({
        title: title.trim(),
        description: desc.trim() || undefined,
        cover_image: newCoverImage.trim() || undefined,
        due_date: newDueDate || undefined,
        tags: newTags.length > 0 ? newTags : undefined,
      })
      setTitle("")
      setDesc("")
      setNewCoverImage("")
      setCoverUploading(false)
      setNewDueDate("")
      setNewTags([])
      setNewTagInput("")
      setShowForm(false)
      const tasks = templateTasks
      setTemplateTasks([])
      setShowTemplates(false)
      if (created?.id && tasks.length > 0) {
        const token = await getFirebaseToken()
        await Promise.all(tasks.map((taskTitle, i) =>
          fetch(`/api/plans/${created.id}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: taskTitle, sort_order: i }),
          })
        ))
        toast.success(`Plan creado con ${tasks.length} tareas 🎉`)
      } else {
        toast.success("Plan creado 🎉")
      }
      if (created?.id) {
        setNewlyCreatedId(created.id)
        setTimeout(() => setNewlyCreatedId(null), 1500)
      }
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
          <div className="animate-bounce-slow" style={{ flexShrink: 0, position: "relative", color: "var(--primary)" }}>
            <Mail size={32} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--foreground)", marginBottom: "0.125rem" }}>
              ¡Conecta con tu pareja!
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-light)" }}>
              Comparte vuestro código y empezad a crear recuerdos juntos
            </p>
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0, fontSize: "0.8125rem", position: "relative" }} onClick={openCoupleModal}>
            <Heart size={14} /> Vincular
          </button>
        </div>
      )}

      {/* ── HERO STORIES CARD ─────────────────────────────────────────── */}
      {hasCouple && (() => {
        const now = new Date()
        const dayName = ES_DAYS_SHORT[now.getDay()]
        const dayNum = now.getDate()
        const monthName = ES_MONTHS_FULL[now.getMonth()]
        const grad = MONTH_GRADIENTS[now.getMonth()]
        const partner = coupleData?.partner
        const firstName = user?.displayName?.split(" ")[0] ?? "tú"
        const partnerFirst = partnerNickname.trim() || partner?.name?.split(" ")[0] || "pareja"
        const couplePhoto = coupleData?.couple?.photo_url ?? null
        const days = daysTogether(coupleData?.couple?.anniversary_date)
        const until = daysUntilAnniversary(coupleData?.couple?.anniversary_date)
        const activePlanCount = filteredActive.length
        const totalDone = allPlans.reduce((s, p) => s + (p.completed_count ?? 0), 0)
        const totalTasks = allPlans.reduce((s, p) => s + (p.task_count ?? 0), 0)

        const pct = `calc(100% / 3)`  // each slide = 1/3 of the 300%-wide strip = 100% of card
        const totalPct = Math.round((totalDone / (totalTasks || 1)) * 100)
        const slides = [
          // Slide 0 — Saludo
          <div key="s0" style={{ position: "relative", flex: `0 0 ${pct}`, height: "100%", padding: "1rem 1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "white", overflow: "hidden" }}>
            {!couplePhoto && (
              <>
                <div aria-hidden style={{ position: "absolute", top: "-20%", right: "-10%", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                <div aria-hidden style={{ position: "absolute", bottom: 0, left: "-5%", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
              </>
            )}
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6875rem", fontWeight: 600, opacity: 0.85, textTransform: "capitalize", textShadow: couplePhoto ? "0 1px 6px rgba(0,0,0,0.5)" : undefined, marginBottom: "0.125rem" }}>
              {dayName} {dayNum} de {monthName}
            </p>
            <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.15, marginBottom: "0.5rem", textShadow: couplePhoto ? "0 2px 10px rgba(0,0,0,0.55)" : undefined }}>
              Hola, {firstName} & {partnerFirst} 💕
            </h1>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {days !== null && (
                <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: "999px", padding: "2px 9px", fontSize: "0.6875rem", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                  {days.toLocaleString("es-ES")} días juntos 💕
                </span>
              )}
              {until !== null && until >= 0 && (
                <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: "999px", padding: "2px 9px", fontSize: "0.6875rem", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                  {until === 0 ? "¡Aniversario hoy! 🎉" : `${until}d próx. aniv.`}
                </span>
              )}
              <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: "999px", padding: "2px 9px", fontSize: "0.6875rem", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                {activePlanCount === 0 ? "Sin planes activos" : `${activePlanCount} plan${activePlanCount !== 1 ? "es" : ""} activo${activePlanCount !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>,

          // Slide 1 — Acciones rápidas + progreso
          <div key="s1" style={{ flex: `0 0 ${pct}`, height: "100%", padding: "0.75rem 1rem 1.375rem", display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--card)" }}>
            <p style={{ margin: 0, fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Acciones rápidas
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", flex: 1 }}>
              {([
                { emoji: "✍️", label: "Diario",   onClick: () => openPhoneModal("journal") },
                { emoji: "📷", label: "Foto",     onClick: () => router.push("/fotos") },
                { emoji: "💌", label: "Carta",    onClick: () => openPhoneModal("journal") },
                { emoji: "⏳", label: "Cápsula",  onClick: () => openPhoneModal("capsule") },
              ]).map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.4rem 0.625rem", borderRadius: "10px", border: "1px solid var(--border)",
                    cursor: "pointer", background: "var(--background)", fontFamily: "inherit",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <span style={{ fontSize: "1rem", lineHeight: 1 }}>{action.emoji}</span>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--foreground)" }}>{action.label}</span>
                </button>
              ))}
            </div>
            {/* Barra de progreso */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.6rem", color: "var(--foreground-muted)", fontWeight: 600 }}>
                  {totalDone > 0 ? `${totalDone} tarea${totalDone !== 1 ? "s" : ""} completada${totalDone !== 1 ? "s" : ""}` : "Sin tareas completadas aún"}
                </span>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--primary)" }}>{totalPct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: "999px", background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalPct}%`, borderRadius: "999px", background: "linear-gradient(90deg, var(--primary-light), var(--primary))", transition: "width 0.4s ease" }} />
              </div>
            </div>
          </div>,

          // Slide 2 — Actividad del partner
          <div key="s2" style={{ flex: `0 0 ${pct}`, height: "100%", padding: "0.75rem 1rem 1.375rem", display: "flex", flexDirection: "column", gap: "0.4rem", background: "var(--card)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.125rem" }}>
              {partner?.avatar_url ? (
                <img src={partner.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-light)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary-lighter)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", flexShrink: 0 }}>
                  {partnerFirst[0]?.toUpperCase()}
                </div>
              )}
              <p style={{ margin: 0, fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Actividad de {partnerFirst}
              </p>
            </div>
            {partnerActivities.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                <span style={{ fontSize: "1.5rem" }}>👀</span>
                <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", margin: 0, textAlign: "center" }}>
                  {partnerFirst} no ha hecho nada aún
                </p>
              </div>
            ) : (
              partnerActivities.slice(0, 4).map((act) => (
                <div key={act.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--primary-lighter)", borderRadius: "8px", padding: "5px 8px", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.875rem", lineHeight: 1 }}>{activityEmoji(act.type)}</span>
                  <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {act.description}
                  </span>
                  <span style={{ fontSize: "0.5625rem", color: "var(--foreground-muted)", flexShrink: 0 }}>{relativeTime(act.created_at)}</span>
                </div>
              ))
            )}
          </div>,
        ]

        return (
          <>
            {/* HeroCard */}
            <div
              style={{
                borderRadius: "var(--radius-xl)",
                marginBottom: "0.75rem",
                overflow: "hidden",
                position: "relative",
                height: 172,
                background: heroSlide === 0
                  ? (couplePhoto
                    ? `linear-gradient(160deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.62) 100%), center / cover no-repeat url("${couplePhoto}")`
                    : grad)
                  : "var(--card)",
                border: heroSlide === 0 ? "none" : "1px solid var(--border)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
              onTouchStart={(e) => { heroTouchStartX.current = e.touches[0].clientX }}
              onTouchEnd={(e) => {
                const delta = e.changedTouches[0].clientX - heroTouchStartX.current
                if (delta < -50) setHeroSlide((s) => Math.min(s + 1, slides.length - 1))
                if (delta > 50) setHeroSlide((s) => Math.max(s - 1, 0))
              }}
            >
              {/* Slides strip */}
              <div style={{
                display: "flex", width: `${slides.length * 100}%`, height: "100%",
                transform: `translateX(calc(-${heroSlide * (100 / slides.length)}%))`,
                transition: "transform 0.3s ease",
              }}>
                {slides}
              </div>
              {/* Dot indicators */}
              <div style={{
                position: "absolute", bottom: "0.375rem", left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: "5px", alignItems: "center",
              }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroSlide(i)}
                    style={{
                      width: heroSlide === i ? 16 : 6, height: 6, borderRadius: "999px",
                      border: "none", cursor: "pointer", padding: 0,
                      background: heroSlide === i
                        ? (heroSlide === 0 ? "rgba(255,255,255,0.9)" : "var(--primary)")
                        : (heroSlide === 0 ? "rgba(255,255,255,0.35)" : "var(--border)"),
                      transition: "width 0.2s ease, background 0.2s ease",
                    }}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Sticky collapsed bar — appears when scrolled past hero */}
            <div style={{
              position: "sticky",
              top: 56,
              zIndex: 30,
              marginLeft: "-1rem",
              marginRight: "-1rem",
              marginBottom: isScrolled ? "0.75rem" : 0,
              transform: isScrolled ? "translateY(0)" : "translateY(-100%)",
              opacity: isScrolled ? 1 : 0,
              pointerEvents: isScrolled ? "auto" : "none",
              transition: "transform 0.22s ease, opacity 0.22s ease, margin-bottom 0.22s ease",
              background: "var(--background)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", padding: "0 1rem", height: 48, gap: "0.5rem",
            }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, flex: 1, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                💕 {firstName} & {partnerFirst}{days !== null ? ` · ${days.toLocaleString("es-ES")}d` : ""}
              </span>
              {([
                { emoji: "✍️", onClick: () => openPhoneModal("journal") },
                { emoji: "📷", onClick: () => router.push("/fotos") },
                { emoji: "💌", onClick: () => openPhoneModal("journal") },
                { emoji: "⏳", onClick: () => openPhoneModal("capsule") },
              ]).map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.125rem", padding: "4px", lineHeight: 1, borderRadius: "8px" }}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </>
        )
      })()}

      {/* Fallback title when no couple */}
      {!hasCouple && (
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.75rem" }}>
          Nuestros Planes 📋
        </h1>
      )}

      {/* Search bar */}
      {hasAnyPlans && allPlans.length > 2 && (
        <div style={{ position: "relative", marginBottom: "0.875rem" }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none" }} />
          <input
            className="input"
            type="search"
            placeholder="Buscar planes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.25rem", background: T.inputBg, borderColor: T.border, color: T.text }}
          />
        </div>
      )}

      {/* Tag filter pills */}
      {hasAnyPlans && allTags.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "row",
          gap: "0.375rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "4px",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          marginBottom: "0.5rem",
        } as React.CSSProperties}>
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
              background: activeTagFilter === null ? "var(--secondary)" : T.muted,
              color: activeTagFilter === null ? "white" : T.textMuted,
              transition: "background 0.15s, color 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              scrollSnapAlign: "start",
              flexShrink: 0,
            } as React.CSSProperties}
          >
            <Tag size={11} /> Todos
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
                background: activeTagFilter === tag ? "var(--primary)" : T.muted,
                color: activeTagFilter === tag ? "white" : T.textMuted,
                transition: "background 0.15s, color 0.15s",
                scrollSnapAlign: "start",
                flexShrink: 0,
              } as React.CSSProperties}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Sort dropdown + view toggle */}
      {hasAnyPlans && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
          {/* Custom sort dropdown */}
          <div ref={sortMenuRef} style={{ flex: 1, position: "relative" }}>
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              style={{
                width: "100%",
                height: "30px",
                borderRadius: "999px",
                border: `1px solid ${T.border}`,
                background: T.surface,
                color: T.textMuted,
                fontFamily: "inherit",
                fontSize: "0.6875rem",
                fontWeight: 600,
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.25rem",
              }}
            >
              <span>
                {sortBy === "newest" && "↓ Recientes"}
                {sortBy === "oldest" && "↑ Antiguos"}
                {sortBy === "progress_desc" && "▲ Más avanzados"}
                {sortBy === "progress_asc" && "▼ Menos avanzados"}
              </span>
              <ChevronDown size={12} style={{ transition: "transform 0.2s", transform: showSortMenu ? "rotate(180deg)" : "none", flexShrink: 0 }} />
            </button>
            {showSortMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0, right: 0,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-lg)",
                  overflow: "hidden",
                  zIndex: 100,
                  animation: "modalIn 0.15s ease",
                }}
              >
                {([
                  { key: "newest",       label: "↓ Recientes" },
                  { key: "oldest",       label: "↑ Antiguos" },
                  { key: "progress_desc", label: "▲ Más avanzados" },
                  { key: "progress_asc", label: "▼ Menos avanzados" },
                ] as { key: SortBy; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setLocalPlanOrder(null); setShowSortMenu(false) }}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.875rem",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      background: sortBy === key ? "var(--primary-lighter)" : "transparent",
                      color: sortBy === key ? "var(--primary)" : "var(--foreground)",
                      fontFamily: "inherit",
                      fontSize: "0.8125rem",
                      fontWeight: sortBy === key ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left" as const,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {label}
                    {sortBy === key && <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* View mode toggle */}
          <div style={{ display: "flex", borderRadius: "999px", border: `1px solid ${T.border}`, overflow: "hidden", flexShrink: 0 }}>
            {([
              { key: "grid", icon: "▦", title: "Planes" },
              { key: "calendar", icon: "Cal", title: "Calendario" },
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
                  fontSize: "0.6875rem",
                  background: viewMode === key ? "var(--primary)" : T.surface,
                  color: viewMode === key ? "white" : T.textMuted,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {icon}
              </button>
            ))}
          </div>
          {/* D5: List/grid toggle */}
          <button
            onClick={() => setListView(v => !v)}
            style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: "var(--radius-md)", padding: "0.375rem 0.625rem",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem",
              fontSize: "0.75rem", fontWeight: 600, color: T.textMuted,
              fontFamily: "inherit",
            }}
            title={listView ? "Vista cuadrícula" : "Vista lista"}
          >
            {listView ? <LayoutGrid size={15} /> : <Rows3 size={15} />}
          </button>
        </div>
      )}

      {/* New plan modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setShowTemplates(false); setTemplateTasks([]) }}
        title="Nuevo Plan"
        footer={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate} disabled={createPlan.isPending}>
              {createPlan.isPending ? "Creando..." : "Crear plan"}
            </button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        }
      >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {/* F1: Template picker */}
            <div>
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
                  border: "1.5px dashed var(--primary)", background: "var(--primary-lighter)",
                  color: "var(--primary)", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>✨ Usar plantilla</span>
                <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: showTemplates ? "rotate(180deg)" : "none" }} />
              </button>
              {showTemplates && (
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem",
                  marginTop: "0.375rem",
                }}>
                  {PLAN_TEMPLATES.map((tpl) => {
                    const selected = tpl.tasks.every((t) => templateTasks.includes(t))
                    return (
                      <button
                        key={tpl.title}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setTemplateTasks([])
                            setTitle("")
                            setDesc("")
                            setNewTags([])
                          } else {
                            setTemplateTasks([...tpl.tasks])
                            setTitle(tpl.title)
                            setDesc(tpl.desc)
                            setNewTags([...tpl.tags])
                          }
                        }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "flex-start",
                          gap: "2px", padding: "0.5rem 0.625rem",
                          borderRadius: "var(--radius-md)",
                          border: selected ? "2px solid var(--primary)" : "1px solid var(--border)",
                          background: selected ? "var(--primary-lighter)" : "var(--surface)",
                          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: "1.125rem" }}>{tpl.emoji}</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selected ? "var(--primary)" : "var(--foreground)", lineHeight: 1.2 }}>{tpl.title}</span>
                        <span style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{tpl.tasks.length} tareas</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {templateTasks.length > 0 && (
                <div style={{ marginTop: "0.375rem", fontSize: "0.6875rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle2 size={12} /> {templateTasks.length} tareas se crearán automáticamente
                </div>
              )}
            </div>
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
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <ImagePlus size={13} /> Portada (opcional)
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }}
              />
              {newCoverImage ? (
                <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", height: "72px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newCoverImage} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => { setNewCoverImage(""); if (coverInputRef.current) coverInputRef.current.value = "" }}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
                      width: 22, height: 22, cursor: "pointer", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  style={{
                    width: "100%", height: "56px", border: "2px dashed var(--border)",
                    borderRadius: "var(--radius-md)", background: "var(--muted)",
                    cursor: coverUploading ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    fontSize: "0.8125rem", color: "var(--foreground-muted)", fontFamily: "inherit",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                >
                  {coverUploading
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Subiendo...</>
                    : <><ImagePlus size={15} /> Subir foto de portada</>
                  }
                </button>
              )}
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <Calendar size={13} /> Fecha objetivo (opcional)
              </label>
              <input
                className="input"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <Tag size={13} /> Etiquetas
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
          </div>
      </Modal>

      {/* Calendar view */}
      {viewMode === "calendar" && !isLoading && (
        <div className="card animate-fade-in">
          <PlanCalendar plans={allPlans} />
        </div>
      )}

      {/* Plans grid */}
      {viewMode === "grid" && (
        isLoading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="skeleton" style={{ height: "88px", borderRadius: 0 }} />
                <div style={{ padding: "0.75rem 0.875rem 0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <div className="skeleton" style={{ height: "14px", width: "65%" }} />
                  <div className="skeleton" style={{ height: "8px", width: "100%", borderRadius: "999px" }} />
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <div className="skeleton" style={{ height: "18px", width: "50px", borderRadius: "999px" }} />
                    <div className="skeleton" style={{ height: "18px", width: "40px", borderRadius: "999px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyPlans || noResults ? (
          <div className="empty-state" style={{ padding: "2.5rem 1rem" }}>
            {/* D3: Kawaii SVG illustration */}
            <div className="animate-bounce-slow" style={{ marginBottom: "1rem" }}>
              <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Heart */}
                <path d="M60 85 C60 85 20 58 20 35 C20 22 30 15 40 15 C48 15 55 20 60 27 C65 20 72 15 80 15 C90 15 100 22 100 35 C100 58 60 85 60 85Z" fill="#EC4899" opacity="0.9" />
                {/* Sparkles */}
                <circle cx="18" cy="20" r="3" fill="#F59E0B" opacity="0.7" />
                <circle cx="102" cy="22" r="2.5" fill="#8B5CF6" opacity="0.7" />
                <circle cx="12" cy="55" r="2" fill="#EC4899" opacity="0.6" />
                <circle cx="108" cy="50" r="2" fill="#F59E0B" opacity="0.6" />
                {/* List lines below heart */}
                <rect x="30" y="92" width="60" height="5" rx="2.5" fill="#8B5CF6" opacity="0.25" />
                {/* Small stars */}
                <text x="14" y="16" fontSize="10" opacity="0.6">✨</text>
                <text x="96" y="18" fontSize="10" opacity="0.6">✨</text>
              </svg>
            </div>
            <h2 className="empty-title" style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", color: "var(--primary)" }}>
              {searchQuery.trim() ? "Nada por aquí..." : hasCouple ? "¡Aún no hay planes!" : "¡Conecta con tu pareja!"}
            </h2>
            <p className="empty-text" style={{ maxWidth: "260px", margin: "0 auto" }}>
              {searchQuery.trim()
                ? "Prueba con otras palabras 🔍"
                : hasCouple
                ? "Crea vuestro primer plan y empieza la aventura juntos 💕"
                : "Vincula a tu pareja para empezar a crear recuerdos"}
            </p>
            {hasCouple && !searchQuery.trim() && (
              <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => setShowForm(true)}>
                <Plus size={16} /> Crear primer plan
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Active plans in progress — drag to reorder */}
            {inProgressPlans.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePlanDragEnd}>
                <SortableContext items={inProgressPlans.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <div style={listView ? { display: "flex", flexDirection: "column", gap: "0.5rem" } : { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
                    {inProgressPlans.map((plan, i) => (
                      <SwipePlanCard key={plan.id} plan={plan} index={i} onDelete={() => handleDeletePlan(plan.id)} cardSize={listView ? "compact" : cardSize} isNew={plan.id === newlyCreatedId} currentUserId={user?.uid} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Completed + archived plans — collapsable */}
            {allCompletedPlans.length > 0 && (
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
                  <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><CheckCircle2 size={14} /> Completados</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                    {allCompletedPlans.length} {showArchived ? "▲" : "▼"}
                  </span>
                </button>
                {showArchived && (
                  <div className="animate-fade-in" style={listView ? { display: "flex", flexDirection: "column", gap: "0.5rem" } : { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
                    {allCompletedPlans.map((plan, i) => (
                      <SwipePlanCard key={plan.id} plan={plan} index={i} onDelete={() => handleDeletePlan(plan.id)} cardSize={listView ? "compact" : cardSize} currentUserId={user?.uid} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* If nothing to show */}
            {filteredActive.length === 0 && filteredArchived.length === 0 && searchQuery.trim() && (
              <div className="empty-state">
                <div className="empty-icon animate-bounce-slow" style={{ color: "var(--foreground-muted)" }}><Search size={48} /></div>
                <p className="empty-text">No hay planes que coincidan con tu búsqueda</p>
              </div>
            )}
          </>
        )
      )}
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}

      {/* D2: FAB Nuevo Plan */}
      {hasCouple && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            border: "none",
            borderRadius: "999px",
            padding: "0.75rem 1.5rem",
            color: "white",
            fontFamily: "inherit",
            fontSize: "0.9375rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={20} />
          Nuevo plan
        </button>
      )}
    </div>
  )
}
