"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePlan, useUpdatePlan, useDeletePlan } from "@/hooks/use-plans"
import { useTasks, useCreateTask, useToggleTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks"
import { TaskItem } from "@/components/features/task-item"
import { KAWAII_ICONS } from "@/types"
import type { Task } from "@/types"
import { ArrowLeft, Plus, Edit2, X, Trash2 } from "lucide-react"
import { useWindowPTR } from "@/hooks/use-window-ptr"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
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
} from "@dnd-kit/sortable"

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { data: plan, isLoading: planLoading } = usePlan(params.id)
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks(params.id)
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()
  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()
  const ptr = useWindowPTR(() => { refetchTasks() })

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskNotes, setTaskNotes] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("heart")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editCoverImage, setEditCoverImage] = useState("")
  const [editDueDate, setEditDueDate] = useState("")
  const [editTagInput, setEditTagInput] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])

  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState("")
  const [editTaskIcon, setEditTaskIcon] = useState("heart")
  const [editTaskNotes, setEditTaskNotes] = useState("")
  const [editTaskDueDate, setEditTaskDueDate] = useState("")

  // Local optimistic task order for drag-and-drop
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null)
  const displayTasks = localTasks ?? tasks ?? []

  const iconEntries = Object.entries(KAWAII_ICONS)

  // DnD sensors — support both pointer (desktop) and touch (mobile)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentTasks = localTasks ?? tasks ?? []
    const oldIndex = currentTasks.findIndex((t) => t.id === active.id)
    const newIndex = currentTasks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(currentTasks, oldIndex, newIndex)
    // Optimistic update
    setLocalTasks(reordered)

    // Persist new sort_orders
    try {
      await Promise.all(
        reordered.map((t, i) =>
          updateTask.mutateAsync({ taskId: t.id, planId: params.id, sort_order: i })
        )
      )
      // After persistence, clear local override so server data takes over
      setLocalTasks(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al reordenar")
      setLocalTasks(null)
    }
  }

  async function handleSaveTaskEdit() {
    if (!editingTaskId || !editTaskTitle.trim()) return
    try {
      await updateTask.mutateAsync({
        taskId: editingTaskId,
        planId: params.id,
        title: editTaskTitle.trim(),
        icon: editTaskIcon,
        notes: editTaskNotes.trim() || null,
        due_date: editTaskDueDate || null,
      })
      setEditingTaskId(null)
      toast.success("Tarea actualizada ✨")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar tarea")
    }
  }

  async function handleMoveTask(taskId: string, direction: "up" | "down") {
    if (!tasks) return
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx < 0) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= tasks.length) return
    const taskA = tasks[idx]
    const taskB = tasks[swapIdx]
    const orderA = taskA.sort_order ?? idx
    const orderB = taskB.sort_order ?? swapIdx
    try {
      await Promise.all([
        updateTask.mutateAsync({ taskId: taskA.id, planId: params.id, sort_order: orderB }),
        updateTask.mutateAsync({ taskId: taskB.id, planId: params.id, sort_order: orderA }),
      ])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al reordenar")
    }
  }
  const total = displayTasks.length
  const done = displayTasks.filter((t) => t.completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAddTask() {
    if (!taskTitle.trim()) return
    try {
      await createTask.mutateAsync({
        planId: params.id,
        title: taskTitle.trim(),
        icon: selectedIcon,
        notes: taskNotes.trim() || undefined,
        due_date: taskDueDate || undefined,
      })
      setTaskTitle("")
      setTaskNotes("")
      setTaskDueDate("")
      setSelectedIcon("heart")
      setShowTaskForm(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear tarea")
    }
  }

  function openEdit() {
    setEditTitle(plan?.title ?? "")
    setEditDesc(plan?.description ?? "")
    setEditCoverImage(plan?.cover_image ?? "")
    setEditDueDate(plan?.due_date ?? "")
    setEditTags(plan?.tags ?? [])
    setEditTagInput("")
    setShowEditModal(true)
  }

  function handleAddEditTag() {
    const tag = editTagInput.trim()
    if (tag && !editTags.includes(tag)) setEditTags((prev) => [...prev, tag])
    setEditTagInput("")
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) return
    try {
      await updatePlan.mutateAsync({
        id: params.id,
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        cover_image: editCoverImage.trim() || null,
        due_date: editDueDate || null,
        tags: editTags,
      })
      setShowEditModal(false)
      toast.success("Plan actualizado ✨")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar")
    }
  }

  async function handleDeletePlan() {
    if (!confirm("¿Seguro que quieres eliminar este plan?")) return
    try {
      await deletePlan.mutateAsync(params.id)
      router.push("/dashboard")
      toast.success("Plan eliminado")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar")
    }
  }

  if (planLoading) {
    return (
      <div className="loading-screen">
        <svg className="animate-heartbeat" width="40" height="40" viewBox="0 0 24 24" fill="#8B5CF6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {/* Pull-to-refresh indicator */}
      {ptr.visible && (
        <div style={{ position: "fixed", top: "100px", left: "50%", transform: "translateX(-50%)", zIndex: 200,
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
      {/* Sub-header */}
      <header
        style={{
          position: "sticky",
          top: "53px",
          zIndex: 30,
          background: "rgba(253,252,254,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          padding: "0.625rem 1rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {plan?.title ?? "..."}
            </h1>
            {plan?.description && (
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "1px" }}>
                {plan.description}
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={openEdit} title="Editar plan">
            <Edit2 size={16} />
          </button>
        </div>
      </header>

      <div className="page-container animate-page-in">
        {/* Progress */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)" }}>
              Progreso
            </span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--primary)" }}>
              {done}/{total}
            </span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Add task button */}
        <div style={{ marginBottom: "1rem" }}>
          <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>
            <Plus size={18} />
            Agregar Tarea
          </button>
        </div>

        {/* Task form */}
        {showTaskForm && (
          <div className="card animate-fade-in" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Nueva Tarea</h2>
              <button className="btn-icon" onClick={() => setShowTaskForm(false)}><X size={16} /></button>
            </div>
            <input
              className="input"
              type="text"
              placeholder="Título de la tarea"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              style={{ marginBottom: "0.75rem" }}
              autoFocus
            />
            <textarea
              className="textarea"
              rows={2}
              placeholder="Nota opcional..."
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              style={{ marginBottom: "0.75rem" }}
            />
            <input
              type="date"
              className="input"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              style={{ marginBottom: "0.75rem" }}
            />
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)", marginBottom: "0.5rem" }}>
                Ícono personalizado
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {iconEntries.map(([key, emoji]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedIcon(key)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      border: selectedIcon === key ? "2px solid var(--primary)" : "2px solid transparent",
                      background: selectedIcon === key ? "var(--primary-lighter)" : "var(--muted)",
                      fontSize: "1.125rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={key}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleAddTask} disabled={createTask.isPending}>
                {createTask.isPending ? "Creando..." : "Crear"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowTaskForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Tasks list */}
        {tasksLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <span style={{ color: "var(--foreground-muted)" }}>Cargando tareas...</span>
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon animate-bounce-slow">🌟</div>
            <h2 className="empty-title" style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem" }}>¡Sin tareas aún!</h2>
            <p className="empty-text">Añade vuestra primera tarea y empezad juntos ✨</p>
            <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} onClick={() => setShowTaskForm(true)}>
              ➕ Agregar tarea
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
          <div>
            {displayTasks.map((task, i) => (
              <div key={task.id}>
                <TaskItem
                  task={task}
                  onToggle={() => toggleTask.mutate({ taskId: task.id, planId: params.id, completed: task.completed })}
                  onDelete={() => deleteTask.mutate({ taskId: task.id, planId: params.id })}
                  onEdit={() => {
                    setEditingTaskId(task.id)
                    setEditTaskTitle(task.title)
                    setEditTaskIcon(task.icon ?? "heart")
                    setEditTaskNotes(task.notes ?? "")
                    setEditTaskDueDate(task.due_date ?? "")
                  }}
                  onMoveUp={i > 0 ? () => handleMoveTask(task.id, "up") : undefined}
                  onMoveDown={i < displayTasks.length - 1 ? () => handleMoveTask(task.id, "down") : undefined}
                  currentUserId={user?.uid}
                />
                {editingTaskId === task.id && (
                  <div className="card animate-fade-in" style={{ marginBottom: "0.75rem", marginTop: "-0.25rem", borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "2px solid var(--primary-lighter)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                      <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--primary)" }}>✏️ Editar Tarea</h3>
                      <button className="btn-icon" onClick={() => setEditingTaskId(null)}><X size={14} /></button>
                    </div>
                    <input
                      className="input"
                      type="text"
                      value={editTaskTitle}
                      onChange={(e) => setEditTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTaskEdit()}
                      style={{ marginBottom: "0.625rem" }}
                      autoFocus
                    />
                    <textarea
                      className="textarea"
                      rows={2}
                      placeholder="Nota opcional..."
                      value={editTaskNotes}
                      onChange={(e) => setEditTaskNotes(e.target.value)}
                      style={{ marginBottom: "0.625rem" }}
                    />
                    <input
                      type="date"
                      className="input"
                      value={editTaskDueDate}
                      onChange={(e) => setEditTaskDueDate(e.target.value)}
                      style={{ marginBottom: "0.625rem" }}
                    />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.625rem" }}>
                      {iconEntries.map(([key, emoji]) => (
                        <button
                          key={key}
                          onClick={() => setEditTaskIcon(key)}
                          style={{
                            width: "32px", height: "32px", borderRadius: "8px",
                            border: editTaskIcon === key ? "2px solid var(--primary)" : "2px solid transparent",
                            background: editTaskIcon === key ? "var(--primary-lighter)" : "var(--muted)",
                            fontSize: "1rem", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >{emoji}</button>
                      ))}
                    </div>
                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={handleSaveTaskEdit} disabled={updateTask.isPending}>
                        {updateTask.isPending ? "Guardando..." : "Guardar"}
                      </button>
                      <button className="btn btn-outline" onClick={() => setEditingTaskId(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <div className="modal-overlay-bg" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Editar Plan</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título del plan"
                  autoFocus
                />
                <textarea
                  className="textarea"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                />
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "block", marginBottom: "0.25rem" }}>
                    🖼️ URL de portada (opcional)
                  </label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://..."
                    value={editCoverImage}
                    onChange={(e) => setEditCoverImage(e.target.value)}
                  />
                  {editCoverImage.trim() && (
                    <div style={{ marginTop: "0.375rem", borderRadius: "var(--radius-md)", overflow: "hidden", height: "60px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={editCoverImage.trim()} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
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
                      placeholder="Nueva etiqueta..."
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEditTag() } }}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-outline" type="button" onClick={handleAddEditTag} style={{ flexShrink: 0, fontSize: "0.75rem" }}>
                      +
                    </button>
                  </div>
                  {editTags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.375rem" }}>
                      {editTags.map((tag) => (
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
                            onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "var(--primary)", fontWeight: 700, fontSize: "0.75rem" }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={updatePlan.isPending}>
                    {updatePlan.isPending ? "Guardando..." : "Guardar Cambios"}
                  </button>
                  <button
                    className="btn btn-outline btn-danger"
                    onClick={handleDeletePlan}
                    disabled={deletePlan.isPending}
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    updatePlan.mutateAsync({ id: params.id, archived: !plan?.archived }).then(() => {
                      setShowEditModal(false)
                      router.push("/dashboard")
                    })
                  }
                >
                  {plan?.archived ? "📤 Desarchivar" : "📦 Archivar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
