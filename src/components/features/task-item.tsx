"use client"

import { useState } from "react"
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

  function handleToggle() {
    if (!task.completed) {
      setPopping(true)
      setSparkle(true)
      setTimeout(() => setPopping(false), 400)
      setTimeout(() => setSparkle(false), 700)
    }
    onToggle()
  }

  return (
    <div className={`task-item animate-fade-in ${task.completed ? "completed" : ""}`}>
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

      <span style={{ fontSize: "1.375rem", flexShrink: 0 }}>{emoji}</span>

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

      <button
        className="btn-icon-small"
        onClick={onDelete}
        title="Eliminar tarea"
        style={{ color: "var(--destructive-dark)", flexShrink: 0 }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
