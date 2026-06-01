"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import type { Task } from "@/types"
import { Trash2, Check, GripVertical, Heart, Flame, Laugh, Star, Zap, AlertTriangle, Calendar, CheckCircle2, Sparkles, Edit2, Bell, User, ChevronRight, ChevronDown, Plus, X, Loader2, ImageIcon } from "lucide-react"
import { KawaiiIcon } from "@/components/ui/kawaii-icon"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from "@/hooks/use-subtasks"

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
  const auth = getFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
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
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: "0.5rem", fontWeight: 700,
      background: "#fef3c7", color: "#d97706",
      borderRadius: 4, padding: "1px 4px",
      marginTop: 2, textDecoration: "none",
    }}>
      <Bell size={8} /> {label}
    </span>
  )
}

// Subtasks sub-component
function SubtasksSection({ task, currentUserId }: { task: Task; currentUserId?: string }) {
  const [expanded, setExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: subtasks = [], isLoading } = useSubtasks(task.id)
  const createSubtask = useCreateSubtask()
  const toggleSubtask = useToggleSubtask()
  const deleteSubtask = useDeleteSubtask()

  const total = subtasks.length
  const done = subtasks.filter((s) => s.completed).length

  async function handleAdd() {
    if (!newTitle.trim()) return
    await createSubtask.mutateAsync({ taskId: task.id, title: newTitle.trim(), sort_order: total })
    setNewTitle("")
    setAdding(false)
  }

  if (!expanded && total === 0 && !adding) {
    return (
      <div style={{ paddingLeft: "0.5rem", paddingBottom: "0.25rem" }}>
        <button
          onClick={() => { setExpanded(true); setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.6875rem", color: "var(--foreground-muted)",
            display: "flex", alignItems: "center", gap: 3, padding: "2px 0",
          }}
        >
          <Plus size={11} /> Añadir subtarea
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: "var(--muted)", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)", paddingBottom: "0.375rem" }}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
          padding: "0.25rem 0.625rem",
          fontSize: "0.6875rem", fontWeight: 600, color: "var(--foreground-light)",
        }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {isLoading ? "Subtareas..." : total === 0 ? "Subtareas" : done === total ? `✓ ${total}/${total} hechas` : `${done}/${total} subtareas`}
      </button>

      {expanded && (
        <div style={{ paddingLeft: "0.625rem", paddingRight: "0.5rem" }}>
          {subtasks.map((sub) => (
            <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
              <button
                onClick={() => toggleSubtask.mutate({ taskId: task.id, subtask: sub })}
                style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: "pointer",
                  border: "1.5px solid var(--primary)", background: sub.completed ? "var(--primary)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {sub.completed && <Check size={9} color="white" strokeWidth={3} />}
              </button>
              <span style={{
                flex: 1, fontSize: "0.75rem", color: "var(--foreground)",
                textDecoration: sub.completed ? "line-through" : "none",
                opacity: sub.completed ? 0.55 : 1,
              }}>
                {sub.title}
              </span>
              <button
                onClick={() => deleteSubtask.mutate({ taskId: task.id, subtaskId: sub.id })}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--foreground-muted)", display: "flex" }}
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {/* Add row */}
          {adding ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewTitle("") } }}
                placeholder="Nueva subtarea..."
                style={{
                  flex: 1, fontSize: "0.75rem", border: "1px solid var(--border)", borderRadius: 6,
                  padding: "3px 6px", outline: "none", background: "var(--surface)", fontFamily: "inherit",
                  color: "var(--foreground)",
                }}
                autoFocus
              />
              <button
                onClick={handleAdd}
                disabled={createSubtask.isPending}
                style={{ background: "var(--primary)", border: "none", borderRadius: 5, padding: "3px 6px", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}
              >
                {createSubtask.isPending ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={11} />}
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle("") }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--foreground-muted)", display: "flex" }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              style={{
                background: "none", border: "none", cursor: "pointer", marginTop: 3,
                fontSize: "0.6875rem", color: "var(--foreground-muted)",
                display: "flex", alignItems: "center", gap: 3, padding: "2px 0",
              }}
            >
              <Plus size={11} /> Añadir subtarea
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function TaskItem({ task, onToggle, onDelete, onEdit, currentUserId, showSubtasks = true }: Props) {
  const [popping, setPopping] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [reactLoading, setReactLoading] = useState(false)

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
          const target = swipeXRef.current === -80
            ? Math.min(0, -80 + (dx > 0 ? dx : 0))
            : Math.max(-80, dx < 0 ? dx : 0)
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

  return (
    <div ref={setNodeRef} style={{ ...dndStyle, position: "relative", marginBottom: "0.5rem" }}>
      {/* Outer clip wrapper — swipe touch handlers live here */}
      <div
        ref={swipeContainerRef}
        style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden" }}
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

        {/* Sliding content */}
        <div
          className={`task-item animate-fade-in ${task.completed ? "completed" : ""}`}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: "transform 0.22s ease",
            marginBottom: 0,
          }}
          onClick={() => { if (swipeX < -10) { swipeXRef.current = 0; setSwipeX(0) } }}
        >
          {/* Drag handle */}
          {!task.completed && (
            <div
              {...attributes}
              {...listeners}
              style={{ cursor: "grab", padding: "4px 2px", color: "var(--border)", display: "flex", alignItems: "center", touchAction: "none", flexShrink: 0 }}
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
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: task.completed
              ? "linear-gradient(135deg, var(--primary), var(--secondary))"
              : "var(--primary-lighter)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <KawaiiIcon name={task.icon} size={18} color={task.completed ? "white" : "var(--primary)"} />
          </div>

          {/* Title — long-press target */}
          <span
            className="task-title"
            style={{
              flex: 1, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)",
              textDecoration: task.completed ? "line-through" : "none",
              opacity: task.completed ? 0.6 : 1,
              userSelect: "none", WebkitUserSelect: "none",
            }}
            onPointerDown={() => startLongPress()}
            onPointerUp={() => cancelLongPress()}
            onPointerCancel={() => cancelLongPress()}
            onPointerMove={() => cancelLongPress()}
            onDoubleClick={() => onEdit?.()}
          >
            {task.title}
            {task.completed && task.completed_by_name && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, textDecoration: "none" }}>
                <CheckCircle2 size={10} style={{ flexShrink: 0 }} /> {task.completed_by_name}
              </span>
            )}
            {task.notes && (
              <span style={{ display: "block", fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, marginTop: 1 }}>
                {task.notes}
              </span>
            )}
            {task.due_date && (() => {
              const today = new Date().toISOString().split("T")[0]
              const diffDays = Math.ceil((new Date(task.due_date).getTime() - new Date(today).getTime()) / 86_400_000)
              let badge: React.ReactNode
              if (task.due_date < today)
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "#fef2f2", color: "#dc2626", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><AlertTriangle size={9} /> Vencida</span>
              else if (task.due_date === today)
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "#fff7ed", color: "#ea580c", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><Calendar size={9} /> Hoy</span>
              else if (diffDays <= 3)
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "#fefce8", color: "#ca8a04", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><Calendar size={9} /> En {diffDays} días</span>
              else {
                const [, m, d] = task.due_date.split("-")
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "var(--muted)", color: "var(--foreground-muted)", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><Calendar size={9} /> {d}/{m}</span>
              }
              return <span style={{ display: "block" }}>{badge}</span>
            })()}
            {showReminderBadge && task.reminder_at && (
              <span style={{ display: "block" }}>
                <ReminderBadge reminderAt={task.reminder_at} />
              </span>
            )}
          </span>

          {/* Assigned-to badge */}
          {assignedColor && (
            <div
              title={task.assigned_to === currentUserId ? "Asignada a ti" : "Asignada a tu pareja"}
              style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: assignedColor, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0.85,
              }}
            >
              <User size={12} color="white" />
            </div>
          )}

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", color: "var(--foreground-muted)", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center" }}
              title="Editar (o doble toque en el texto)"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>

        {/* Photo strip */}
        {photos.length > 0 && (
          <div style={{
            display: "flex", gap: 4, padding: "0 0.625rem 0.375rem",
            background: "var(--surface)",
            transform: `translateX(${swipeX}px)`,
            transition: "transform 0.22s ease",
          }}>
            {photos.slice(0, 3).map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`foto ${i + 1}`}
                  style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, display: "block" }}
                />
                {i === 2 && photos.length > 3 && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                    borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "0.75rem", fontWeight: 700,
                  }}>
                    +{photos.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reactions row */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.25rem", paddingLeft: "0.5rem", paddingBottom: "0.25rem", minHeight: "0.5rem", flexWrap: "wrap", background: "var(--surface)" }}>
        {Object.entries(reactionGroups).map(([key, { count, mine }]) => (
          <button
            key={key}
            onClick={() => handleReact(key)}
            disabled={reactLoading}
            style={{
              background: mine ? "var(--primary-lighter)" : "var(--muted)",
              border: mine ? "1px solid var(--primary)" : "1px solid var(--border)",
              borderRadius: 20, padding: "2px 8px", fontSize: "0.7rem",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
              color: mine ? "var(--primary)" : "var(--foreground-muted)", transition: "transform 0.1s",
            }}
            title={mine ? "Quitar reacción" : "Reaccionar"}
          >
            {REACTION_ICON_MAP[key]}
            <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>{count}</span>
          </button>
        ))}

        {/* Long-press reaction picker — appears when holding the task */}
        {showPicker && (
          <>
            {/* Backdrop to close */}
            <div
              onClick={() => setShowPicker(false)}
              style={{ position: "fixed", inset: 0, zIndex: 49 }}
            />
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: "0.5rem",
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

      {/* Subtasks section */}
      {showSubtasks && <SubtasksSection task={task} currentUserId={currentUserId} />}
    </div>
  )
}
