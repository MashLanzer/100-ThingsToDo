"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import type { Task } from "@/types"
import { Trash2, Check, GripVertical, Heart, Flame, Laugh, Star, Zap, AlertTriangle, Calendar, CheckCircle2, Sparkles, Edit2, Bell, User, Plus, X, Loader2, ListChecks, SmilePlus, Pencil } from "lucide-react"
import { KawaiiIcon } from "@/components/ui/kawaii-icon"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getFirebaseToken } from "@/lib/firebase/client"
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask, useUpdateSubtask } from "@/hooks/use-subtasks"
import { Modal } from "@/components/ui/modal"

const REACTIONS: Array<{ key: string; icon: React.ReactNode; label: string }> = [
  { key: "heart", icon: <Heart  size={13} />, label: "Me encanta" },
  { key: "fire",  icon: <Flame  size={13} />, label: "¡Fuego!"    },
  { key: "star",  icon: <Star   size={13} />, label: "¡Genial!"   },
  { key: "laugh", icon: <Laugh  size={13} />, label: "¡Jajaja!"   },
  { key: "zap",   icon: <Zap    size={13} />, label: "¡Vamos!"    },
]
const REACTION_KEYS = REACTIONS.map((r) => r.key)
const REACTION_ICON_MAP: Record<string, React.ReactNode> = Object.fromEntries(REACTIONS.map((r) => [r.key, r.icon]))

interface Reaction { id: string; emoji: string; user_id: string; user_name?: string | null }
interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onEdit?: () => void
  currentUserId?: string
  showSubtasks?: boolean
}

async function authFetch(path: string, init?: RequestInit) {
  const token = await getFirebaseToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
  if (!res.ok) return null
  return res.json()
}

// Bell badge: shown if reminder is within the next 7 days
function ReminderBadge({ reminderAt }: { reminderAt: string }) {
  const date = new Date(reminderAt)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = diffMs / 86_400_000
  if (diffDays < 0 || diffDays > 7) return null
  const label = diffDays < 0.042 ? "ahora" : diffDays < 1 ? "hoy" : `${Math.ceil(diffDays)}d`
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: "0.5625rem", fontWeight: 700,
      background: "#fef3c7", color: "#d97706",
      borderRadius: 5, padding: "1px 6px", textDecoration: "none",
    }}>
      <Bell size={9} /> {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtasks management modal — full CRUD in a dedicated dialog
// ─────────────────────────────────────────────────────────────────────────────
function SubtasksModal({ task, open, onClose }: { task: Task; open: boolean; onClose: () => void }) {
  const { data: subtasks = [], isLoading } = useSubtasks(task.id)
  const createSubtask = useCreateSubtask()
  const toggleSubtask = useToggleSubtask()
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()

  const [newTitle, setNewTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const newInputRef = useRef<HTMLInputElement>(null)

  const total = subtasks.length
  const done = subtasks.filter((s) => s.completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd() {
    const t = newTitle.trim()
    if (!t) return
    await createSubtask.mutateAsync({ taskId: task.id, title: t, sort_order: total })
    setNewTitle("")
    setTimeout(() => newInputRef.current?.focus(), 30)
  }

  async function handleSaveEdit(subtaskId: string) {
    const t = editTitle.trim()
    if (t) await updateSubtask.mutateAsync({ taskId: task.id, subtaskId, title: t })
    setEditingId(null)
    setEditTitle("")
  }

  return (
    <Modal open={open} onClose={onClose} title="Subtareas">
      {/* Progress header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)" }}>{task.title}</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: total > 0 && done === total ? "var(--primary)" : "var(--foreground-muted)" }}>
            {total > 0 ? `${done}/${total}` : "0"}
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: "var(--muted)", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, var(--primary), var(--secondary))",
            borderRadius: 999, transition: "width 0.35s ease",
          }} />
        </div>
      </div>

      {/* Subtask list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "1rem", color: "var(--foreground-muted)", fontSize: "0.8125rem" }}>
          Cargando...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "1rem" }}>
          {subtasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "1.25rem 0.5rem", color: "var(--foreground-muted)" }}>
              <ListChecks size={28} style={{ opacity: 0.4, marginBottom: 6 }} />
              <p style={{ fontSize: "0.8125rem", margin: 0 }}>Divide esta tarea en pasos más pequeños</p>
            </div>
          )}
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "0.5rem 0.625rem",
              }}
            >
              <button
                onClick={() => toggleSubtask.mutate({ taskId: task.id, subtask: sub })}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                  border: "2px solid var(--primary)", background: sub.completed ? "var(--primary)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {sub.completed && <Check size={12} color="white" strokeWidth={3} />}
              </button>

              {editingId === sub.id ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(sub.id); if (e.key === "Escape") { setEditingId(null); setEditTitle("") } }}
                  onBlur={() => handleSaveEdit(sub.id)}
                  autoFocus
                  style={{
                    flex: 1, fontSize: "0.875rem", border: "1px solid var(--primary)", borderRadius: 6,
                    padding: "3px 6px", outline: "none", background: "var(--bg)", fontFamily: "inherit",
                    color: "var(--foreground)",
                  }}
                />
              ) : (
                <span
                  onClick={() => { setEditingId(sub.id); setEditTitle(sub.title) }}
                  style={{
                    flex: 1, fontSize: "0.875rem", color: "var(--foreground)", cursor: "text",
                    textDecoration: sub.completed ? "line-through" : "none",
                    opacity: sub.completed ? 0.5 : 1,
                  }}
                >
                  {sub.title}
                </span>
              )}

              {editingId !== sub.id && (
                <button
                  onClick={() => { setEditingId(sub.id); setEditTitle(sub.title) }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--foreground-muted)", display: "flex", flexShrink: 0 }}
                  title="Editar"
                >
                  <Pencil size={13} />
                </button>
              )}
              <button
                onClick={() => deleteSubtask.mutate({ taskId: task.id, subtaskId: sub.id })}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--foreground-muted)", display: "flex", flexShrink: 0 }}
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new subtask */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={newInputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          placeholder="Añadir subtarea..."
          className="input"
          style={{ flex: 1 }}
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || createSubtask.isPending}
          className="btn btn-primary"
          style={{ flexShrink: 0, padding: "0 1rem", opacity: !newTitle.trim() ? 0.5 : 1 }}
        >
          {createSubtask.isPending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
        </button>
      </div>
    </Modal>
  )
}

export function TaskItem({ task, onToggle, onDelete, onEdit, currentUserId, showSubtasks = true }: Props) {
  const [popping, setPopping] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [reactLoading, setReactLoading] = useState(false)
  const [subtasksOpen, setSubtasksOpen] = useState(false)

  // Subtask counts (lightweight; cached by react-query so shared with modal)
  const { data: subtaskList = [] } = useSubtasks(showSubtasks ? task.id : "")
  const subtaskTotal = subtaskList.length
  const subtaskDone = subtaskList.filter((s) => s.completed).length

  // Refs for swipe (non-passive listeners needed for preventDefault)
  const swipeContainerRef = useRef<HTMLDivElement>(null)
  const swipeXRef = useRef(0)  // mirror of swipeX for use inside event listeners

  // Ref for long-press timer
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const dndStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  // Reminder badge: in next 7 days?
  const showReminderBadge = !!task.reminder_at && (() => {
    const diff = new Date(task.reminder_at!).getTime() - Date.now()
    return diff > 0 && diff <= 7 * 86_400_000
  })()

  // ── Reactions ─────────────────────────────────────────────────
  const fetchReactions = useCallback(async () => {
    const data = await authFetch(`/api/tasks/${task.id}/reactions`)
    if (Array.isArray(data)) setReactions(data)
  }, [task.id])

  useEffect(() => {
    fetchReactions()
    const interval = setInterval(fetchReactions, 30_000)
    return () => clearInterval(interval)
  }, [fetchReactions])

  async function handleReact(key: string) {
    if (reactLoading) return
    setReactLoading(true)
    // Optimistic toggle
    const mine = reactions.some((r) => r.emoji === key && r.user_id === currentUserId)
    setReactions((prev) =>
      mine
        ? prev.filter((r) => !(r.emoji === key && r.user_id === currentUserId))
        : [...prev, { id: "tmp", emoji: key, user_id: currentUserId ?? "", user_name: null }]
    )
    try {
      await authFetch(`/api/tasks/${task.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji: key }),
      })
      await fetchReactions()
    } catch {
      await fetchReactions() // revert on error
    } finally {
      setReactLoading(false)
      setShowPicker(false)
    }
  }

  // Group reactions by key
  const reactionGroups = REACTION_KEYS.reduce<Record<string, { count: number; mine: boolean }>>((acc, key) => {
    const group = reactions.filter((r) => r.emoji === key)
    if (group.length > 0) acc[key] = { count: group.length, mine: group.some((r) => r.user_id === currentUserId) }
    return acc
  }, {})
  const hasReactions = Object.keys(reactionGroups).length > 0

  // ── Toggle with sound/haptic ──────────────────────────────────
  function handleToggle() {
    if (!task.completed) {
      setPopping(true); setSparkle(true)
      setTimeout(() => setPopping(false), 400)
      setTimeout(() => setSparkle(false), 700)
      try {
        const raw = localStorage.getItem("ttd_settings_v1")
        const s = raw ? JSON.parse(raw) : {}
        if (s.vibrationEnabled !== false) navigator.vibrate?.(50)
        if (s.soundEnabled !== false) {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(660, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
          gain.gain.setValueAtTime(0.18, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
        }
      } catch { /* ignore */ }
    }
    onToggle()
  }

  // ── Swipe-to-delete via non-passive touch listeners ───────────
  useEffect(() => {
    const el = swipeContainerRef.current
    if (!el) return

    let startX = 0
    let startY = 0
    let directionLocked = false
    let isHorizontal = false
    let isSwiping = false

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      directionLocked = false
      isHorizontal = false
      isSwiping = false
    }

    function onTouchMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      // Lock direction on first significant movement
      if (!directionLocked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        isHorizontal = Math.abs(dx) > Math.abs(dy)
        directionLocked = true
      }
      if (!directionLocked) return

      if (isHorizontal) {
        e.preventDefault() // Prevent page scroll during horizontal swipe
        isSwiping = true
        const newX = swipeXRef.current + dx - (isSwiping ? 0 : 0)
        const clamped = Math.max(-80, Math.min(0, newX < 0 ? newX : swipeXRef.current + dx))
        if (dx < 0 || swipeXRef.current < 0) {
          swipeXRef.current = clamped
          setSwipeX(clamped)
        }
      }
    }

    function onTouchEnd() {
      if (!isHorizontal) return
      if (swipeXRef.current < -40) {
        swipeXRef.current = -80
        setSwipeX(-80)
      } else {
        swipeXRef.current = 0
        setSwipeX(0)
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    el.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [])

  // Keep ref in sync with state
  useEffect(() => { swipeXRef.current = swipeX }, [swipeX])

  // ── Long-press to show reaction picker (on title area) ────────
  function startLongPress() {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      navigator.vibrate?.(40)
      setShowPicker(true)
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Assigned-to badge color
  const assignedColor = task.assigned_to
    ? task.assigned_to === currentUserId ? "var(--primary)" : "var(--secondary)"
    : null

  // Photo strip: up to 3 thumbnails
  const photos = task.task_photos ?? []

  // Whether the meta row should render at all
  const showMetaRow = showSubtasks || hasReactions || !task.completed

  return (
    <div ref={setNodeRef} style={{ ...dndStyle, position: "relative", marginBottom: "0.625rem" }}>
      {/* Outer clip wrapper — swipe touch handlers live here */}
      <div
        ref={swipeContainerRef}
        style={{
          position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden",
          boxShadow: "0 1px 3px rgba(45,27,62,0.06)",
        }}
      >
        {/* Red delete panel (revealed on swipe) */}
        <div
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
            background: "#ef4444", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { onDelete(); swipeXRef.current = 0; setSwipeX(0) }}
        >
          <Trash2 size={20} color="white" />
        </div>

        {/* Sliding content — single card surface containing everything */}
        <div
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: "transform 0.22s ease",
            background: "var(--surface)",
            border: task.completed ? "1px solid var(--border)" : "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
          onClick={() => { if (swipeX < -10) { swipeXRef.current = 0; setSwipeX(0) } }}
        >
          {/* ── Top row ── */}
          <div
            className={`animate-fade-in ${task.completed ? "completed" : ""}`}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 0.75rem",
            }}
          >
            {/* Drag handle */}
            {!task.completed && (
              <div
                {...attributes}
                {...listeners}
                style={{ cursor: "grab", color: "var(--border)", display: "flex", alignItems: "center", touchAction: "none", flexShrink: 0 }}
                title="Arrastrar para reordenar"
              >
                <GripVertical size={16} />
              </div>
            )}

            {/* Checkbox */}
            <button
              className={`task-checkbox ${task.completed ? "checked" : ""} ${popping ? "animate-task-pop" : ""}`}
              onClick={(e) => {
                e.stopPropagation()
                if (swipeX < -10) { swipeXRef.current = 0; setSwipeX(0); return }
                if (!longPressTriggered.current) handleToggle()
              }}
              title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
              style={{ position: "relative", flexShrink: 0 }}
            >
              {task.completed && <Check size={13} color="white" strokeWidth={3} />}
              {sparkle && (
                <span className="animate-sparkle" style={{ top: "-8px", left: "50%", transform: "translateX(-50%)", display: "flex" }}>
                  <Sparkles size={12} />
                </span>
              )}
            </button>

            {/* Icon bubble */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: task.completed
                ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                : "var(--primary-lighter)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <KawaiiIcon name={task.icon} size={19} color={task.completed ? "white" : "var(--primary)"} />
            </div>

            {/* Title block — long-press target */}
            <div
              style={{
                flex: 1, minWidth: 0,
                userSelect: "none", WebkitUserSelect: "none",
              }}
              onPointerDown={() => startLongPress()}
              onPointerUp={() => cancelLongPress()}
              onPointerCancel={() => cancelLongPress()}
              onPointerMove={() => cancelLongPress()}
              onDoubleClick={() => onEdit?.()}
            >
              <span
                className="task-title"
                style={{
                  display: "block", fontSize: "0.9375rem", fontWeight: 600, color: "var(--foreground)",
                  textDecoration: task.completed ? "line-through" : "none",
                  opacity: task.completed ? 0.55 : 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {task.title}
              </span>

              {task.notes && (
                <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--foreground-muted)", fontWeight: 400, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.notes}
                </span>
              )}

              {/* Inline badges row: due date · reminder · completed-by */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: (task.due_date || showReminderBadge || (task.completed && task.completed_by_name)) ? 4 : 0 }}>
                {task.completed && task.completed_by_name && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", color: "var(--foreground-muted)", fontWeight: 500 }}>
                    <CheckCircle2 size={9} /> {task.completed_by_name}
                  </span>
                )}
                {task.due_date && (() => {
                  const today = new Date().toISOString().split("T")[0]
                  const diffDays = Math.ceil((new Date(task.due_date).getTime() - new Date(today).getTime()) / 86_400_000)
                  const base = { display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", borderRadius: 5, padding: "1px 6px", fontWeight: 700 } as React.CSSProperties
                  if (task.due_date < today)
                    return <span style={{ ...base, background: "#fef2f2", color: "#dc2626" }}><AlertTriangle size={9} /> Vencida</span>
                  if (task.due_date === today)
                    return <span style={{ ...base, background: "#fff7ed", color: "#ea580c" }}><Calendar size={9} /> Hoy</span>
                  if (diffDays <= 3)
                    return <span style={{ ...base, background: "#fefce8", color: "#ca8a04" }}><Calendar size={9} /> {diffDays}d</span>
                  const [, m, d] = task.due_date.split("-")
                  return <span style={{ ...base, background: "var(--muted)", color: "var(--foreground-muted)" }}><Calendar size={9} /> {d}/{m}</span>
                })()}
                {showReminderBadge && task.reminder_at && <ReminderBadge reminderAt={task.reminder_at} />}
              </div>
            </div>

            {/* Assigned-to badge */}
            {assignedColor && (
              <div
                title={task.assigned_to === currentUserId ? "Asignada a ti" : "Asignada a tu pareja"}
                style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: assignedColor, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <User size={12} color="white" />
              </div>
            )}

            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--foreground-muted)", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center" }}
                title="Editar (o doble toque en el texto)"
              >
                <Edit2 size={15} />
              </button>
            )}
          </div>

          {/* ── Photo strip ── */}
          {photos.length > 0 && (
            <div style={{ display: "flex", gap: 5, padding: "0 0.75rem 0.5rem 0.75rem" }}>
              {photos.slice(0, 3).map((url, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`foto ${i + 1}`}
                    style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, display: "block" }}
                  />
                  {i === 2 && photos.length > 3 && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                      borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: "0.75rem", fontWeight: 700,
                    }}>
                      +{photos.length - 3}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Meta row: subtasks chip + reaction chips + add-reaction ── */}
          {showMetaRow && (
            <div style={{
              position: "relative",
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
              padding: "0 0.75rem 0.5rem",
              paddingLeft: !task.completed ? "2.25rem" : "0.75rem", // align under title past handle+checkbox
            }}>
              {/* Subtasks chip */}
              {showSubtasks && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSubtasksOpen(true) }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: subtaskTotal > 0 && subtaskDone === subtaskTotal ? "var(--primary-lighter)" : "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: 999, padding: "2px 9px", cursor: "pointer",
                    fontSize: "0.6875rem", fontWeight: 700,
                    color: subtaskTotal > 0 && subtaskDone === subtaskTotal ? "var(--primary)" : "var(--foreground-muted)",
                  }}
                  title="Administrar subtareas"
                >
                  <ListChecks size={12} />
                  {subtaskTotal > 0 ? `${subtaskDone}/${subtaskTotal}` : "Subtareas"}
                </button>
              )}

              {/* Reaction chips */}
              {Object.entries(reactionGroups).map(([key, { count, mine }]) => (
                <button
                  key={key}
                  onClick={(e) => { e.stopPropagation(); handleReact(key) }}
                  disabled={reactLoading}
                  style={{
                    background: mine ? "var(--primary-lighter)" : "var(--muted)",
                    border: mine ? "1px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: 999, padding: "2px 9px", fontSize: "0.6875rem",
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                    color: mine ? "var(--primary)" : "var(--foreground-muted)", fontWeight: 700,
                  }}
                  title={mine ? "Quitar reacción" : "Reaccionar"}
                >
                  {REACTION_ICON_MAP[key]}
                  {count}
                </button>
              ))}

              {/* Add-reaction button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowPicker((v) => !v) }}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 22, borderRadius: 999,
                  background: "transparent", border: "1px dashed var(--border)",
                  cursor: "pointer", color: "var(--foreground-muted)",
                }}
                title="Añadir reacción"
              >
                <SmilePlus size={13} />
              </button>

              {/* Reaction picker popover */}
              {showPicker && (
                <>
                  <div onClick={() => setShowPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 2px)", left: !task.completed ? "2.25rem" : "0.75rem",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "999px", padding: "6px 8px",
                    display: "flex", gap: 4, zIndex: 50,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                    animation: "modalIn 0.15s ease",
                  }}>
                    {REACTIONS.map(({ key, icon, label }) => {
                      const mine = reactions.some((r) => r.emoji === key && r.user_id === currentUserId)
                      return (
                        <button
                          key={key}
                          onClick={() => { handleReact(key); setShowPicker(false) }}
                          disabled={reactLoading}
                          title={label}
                          style={{
                            background: mine ? "var(--primary-lighter)" : "transparent",
                            border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: mine ? "var(--primary)" : "var(--foreground-muted)",
                            transition: "transform 0.1s, background 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          {icon}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks management modal */}
      {showSubtasks && (
        <SubtasksModal task={task} open={subtasksOpen} onClose={() => setSubtasksOpen(false)} />
      )}
    </div>
  )
}
