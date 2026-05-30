"use client"

import { useState, useRef } from "react"
import { KAWAII_ICONS } from "@/types"
import type { Task } from "@/types"
import { Trash2, Check } from "lucide-react"

interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
}

export function TaskItem({ task, onToggle, onDelete }: Props) {
  const emoji = KAWAII_ICONS[task.icon] ?? task.icon
  const [popping, setPopping] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number>(0)

  function handleToggle() {
    if (!task.completed) {
      setPopping(true)
      setSparkle(true)
      setTimeout(() => setPopping(false), 400)
      setTimeout(() => setSparkle(false), 700)
      // vibration
      try {
        const raw = localStorage.getItem("ttd_settings_v1")
        if (raw) {
          const s = JSON.parse(raw)
          if (s.vibrationEnabled !== false) {
            navigator.vibrate?.(50)
          }
        } else {
          navigator.vibrate?.(50)
        }
      } catch { /* ignore */ }
    }
    onToggle()
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < 0) {
      setSwipeX(Math.max(delta, -80))
    } else {
      setSwipeX(0)
    }
  }

  function handleTouchEnd() {
    setIsSwiping(false)
    if (swipeX < -50) {
      setSwipeX(-80)
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div style={{ position: "relative", marginBottom: "0.5rem", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      {/* Red delete panel behind */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
          background: "#ef4444", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer",
        }}
        onClick={() => { onDelete(); setSwipeX(0) }}
      >
        <Trash2 size={20} color="white" />
      </div>

      {/* Sliding content */}
      <div
        className={`task-item animate-fade-in ${task.completed ? "completed" : ""}`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s ease",
          marginBottom: 0,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          className={`task-checkbox ${task.completed ? "checked" : ""} ${popping ? "animate-task-pop" : ""}`}
          onClick={handleToggle}
          title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
          style={{ position: "relative" }}
        >
          {task.completed && <Check size={13} color="white" strokeWidth={3} />}
          {sparkle && (
            <span className="animate-sparkle" style={{ top: "-8px", left: "50%", transform: "translateX(-50%)" }}>
              ✨
            </span>
          )}
        </button>

        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: task.completed
            ? "linear-gradient(135deg, var(--primary), var(--secondary))"
            : "var(--primary-lighter)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "1.125rem",
        }}>
          {emoji}
        </div>

        <span
          className="task-title"
          style={{
            flex: 1,
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--foreground)",
            textDecoration: task.completed ? "line-through" : "none",
            opacity: task.completed ? 0.6 : 1,
          }}
        >
          {task.title}
          {task.completed && task.completed_by_name && (
            <span style={{ display: "block", fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, textDecoration: "none" }}>
              ✅ {task.completed_by_name}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
