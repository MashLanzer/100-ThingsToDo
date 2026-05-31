"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePlan, useUpdatePlan, useDeletePlan } from "@/hooks/use-plans"
import { useTasks, useCreateTask, useToggleTask, useDeleteTask, useUpdateTask } from "@/hooks/use-tasks"
import { TaskItem } from "@/components/features/task-item"
import { KAWAII_ICON_REGISTRY, KawaiiIcon } from "@/components/ui/kawaii-icon"
import type { Task } from "@/types"
import { ArrowLeft, Plus, Edit2, X, Trash2, Star, Image, Calendar, Tag, Upload, Archive, CheckCircle2, ChevronDown } from "lucide-react"
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

function planGradient(id: string): string {
  const gradients = [
    "linear-gradient(135deg, #8B5CF6, #EC4899)",
    "linear-gradient(135deg, #06B6D4, #10B981)",
    "linear-gradient(135deg, #F59E0B, #EF4444)",
    "linear-gradient(135deg, #EC4899, #A78BFA)",
    "linear-gradient(135deg, #10B981, #3B82F6)",
    "linear-gradient(135deg, #3B82F6, #8B5CF6)",
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function relativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "hoy"
  if (diff === 1) return "ayer"
  if (diff < 30) return `hace ${diff}d`
  if (diff < 365) return `hace ${Math.floor(diff / 30)}m`
  return `hace ${Math.floor(diff / 365)}a`
}

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
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)
  const displayTasks = localTasks ?? tasks ?? []

  const pendingTasks = displayTasks.filter((t) => !t.completed)
  const completedTasksList = displayTasks.filter((t) => t.completed)

  function handleToggle(task: Task) {
    const prevDone = done
    const newDone = task.completed ? done - 1 : done + 1
    const prevPct = total > 0 ? Math.floor((prevDone / total) * 100) : 0
    const newPct = total > 0 ? Math.floor((newDone / total) * 100) : 0
    for (const milestone of [25, 50, 75, 100]) {
      if (prevPct < milestone && newPct >= milestone) {
        if (milestone === 100) {
          toast.success("¡Plan completado! 🎊", { duration: 3000 })
        } else {
          toast.success(`¡${milestone}% completado! 🎉`, { duration: 2000 })
        }
        break
      }
    }
    toggleTask.mutate({ taskId: task.id, planId: params.id, completed: task.completed })
  }

  const iconEntries = Object.keys(KAWAII_ICON_REGISTRY)

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
      {/* Plan hero header */}
      <header
        style={{
          position: "sticky",
          top: "53px",
          zIndex: 30,
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          ...(plan?.cover_image
            ? { backgroundImage: `url(${plan.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: planGradient(params.id) }),
        }}
      >
        {plan?.cover_image && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
        )}
        <div style={{ position: "relative", maxWidth: "800px", margin: "0 auto", padding: "0.75rem 1rem 0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white", flexShrink: 0, backdropFilter: "blur(4px)",
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1
              style={{
                flex: 1, fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700,
                color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {plan?.title ?? "..."}
            </h1>
            <button
              onClick={openEdit}
              title="Editar plan"
              style={{
                background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white", flexShrink: 0, backdropFilter: "blur(4px)",
              }}
            >
              <Edit2 size={15} />
            </button>
          </div>
          {/* Stats pills */}
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.625rem", fontWeight: 600, background: "rgba(255,255,255,0.22)", color: "white", borderRadius: "999px", padding: "2px 8px" }}>
              {total} tarea{total !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: "0.625rem", fontWeight: 600, background: "rgba(255,255,255,0.22)", color: "white", borderRadius: "999px", padding: "2px 8px" }}>
              {done} completada{done !== 1 ? "s" : ""}
            </span>
            {plan?.created_at && (
              <span style={{ fontSize: "0.625rem", fontWeight: 600, background: "rgba(255,255,255,0.22)", color: "white", borderRadius: "999px", padding: "2px 8px" }}>
                Creado {relativeDate(plan.created_at)}
              </span>
            )}
            {plan?.due_date && (() => {
              const today = new Date(); today.setHours(0,0,0,0)
              const due = new Date(plan.due_date + "T00:00:00")
              const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
              const isOverdue = days < 0
              return (
                <span style={{ fontSize: "0.625rem", fontWeight: 600, background: isOverdue ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.22)", color: "white", borderRadius: "999px", padding: "2px 8px" }}>
                  {isOverdue ? "Vencido" : days === 0 ? "¡Hoy!" : `${days}d restantes`}
                </span>
              )
            })()}
          </div>
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
                {iconEntries.map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedIcon(key)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      border: selectedIcon === key ? "2px solid var(--primary)" : "2px solid transparent",
                      background: selectedIcon === key ? "var(--primary-lighter)" : "var(--muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={key}
                  >
                    <KawaiiIcon name={key} size={18} color={selectedIcon === key ? "var(--primary)" : "var(--foreground-muted)"} />
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
            <div className="empty-icon animate-bounce-slow"><Star size={40} color="var(--primary)" /></div>
            <h2 className="empty-title" style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem" }}>¡Sin tareas aún!</h2>
            <p className="empty-text">Añade vuestra primera tarea y empezad juntos</p>
            <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} onClick={() => setShowTaskForm(true)}>
              <Plus size={16} /> Agregar tarea
            </button>
          </div>
        ) : (
          <>
            {/* Pending tasks — drag to reorder */}
            {pendingTasks.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pendingTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {pendingTasks.map((task) => (
                      <div key={task.id}>
                        <TaskItem
                          task={task}
                          onToggle={() => handleToggle(task)}
                          onDelete={() => deleteTask.mutate({ taskId: task.id, planId: params.id })}
                          onEdit={() => {
                            setEditingTaskId(task.id)
                            setEditTaskTitle(task.title)
                            setEditTaskIcon(task.icon ?? "heart")
                            setEditTaskNotes(task.notes ?? "")
                            setEditTaskDueDate(task.due_date ?? "")
                          }}
                          currentUserId={user?.uid}
                        />
                        {editingTaskId === task.id && (
                          <div className="card animate-fade-in" style={{ marginBottom: "0.75rem", marginTop: "-0.25rem", borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "2px solid var(--primary-lighter)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                              <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.375rem" }}><Edit2 size={14} /> Editar Tarea</h3>
                              <button className="btn-icon" onClick={() => setEditingTaskId(null)}><X size={14} /></button>
                            </div>
                            <input className="input" type="text" value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveTaskEdit()} style={{ marginBottom: "0.625rem" }} autoFocus />
                            <textarea className="textarea" rows={2} placeholder="Nota opcional..." value={editTaskNotes} onChange={(e) => setEditTaskNotes(e.target.value)} style={{ marginBottom: "0.625rem" }} />
                            <input type="date" className="input" value={editTaskDueDate} onChange={(e) => setEditTaskDueDate(e.target.value)} style={{ marginBottom: "0.625rem" }} />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.625rem" }}>
                              {iconEntries.map((key) => (
                                <button key={key} onClick={() => setEditTaskIcon(key)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: editTaskIcon === key ? "2px solid var(--primary)" : "2px solid transparent", background: editTaskIcon === key ? "var(--primary-lighter)" : "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <KawaiiIcon name={key} size={16} color={editTaskIcon === key ? "var(--primary)" : "var(--foreground-muted)"} />
                                </button>
                              ))}
                            </div>
                            <div className="form-actions">
                              <button className="btn btn-primary" onClick={handleSaveTaskEdit} disabled={updateTask.isPending}>{updateTask.isPending ? "Guardando..." : "Guardar"}</button>
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

            {/* Completed tasks — collapsable */}
            {completedTasksList.length > 0 && (
              <div style={{ marginTop: pendingTasks.length > 0 ? "0.75rem" : 0 }}>
                <button
                  onClick={() => setShowCompletedTasks((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
                    background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                    padding: "0.5rem 0.75rem", cursor: "pointer", fontFamily: "inherit",
                    fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground-light)",
                    marginBottom: showCompletedTasks ? "0.5rem" : 0,
                  }}
                >
                  <CheckCircle2 size={14} color="var(--success-dark)" />
                  <span>Completadas ({completedTasksList.length})</span>
                  <ChevronDown size={14} style={{ marginLeft: "auto", transition: "transform 0.2s", transform: showCompletedTasks ? "rotate(180deg)" : "none" }} />
                </button>
                {showCompletedTasks && (
                  <div className="animate-fade-in">
                    {completedTasksList.map((task) => (
                      <div key={task.id}>
                        <TaskItem
                          task={task}
                          onToggle={() => handleToggle(task)}
                          onDelete={() => deleteTask.mutate({ taskId: task.id, planId: params.id })}
                          onEdit={() => {
                            setEditingTaskId(task.id)
                            setEditTaskTitle(task.title)
                            setEditTaskIcon(task.icon ?? "heart")
                            setEditTaskNotes(task.notes ?? "")
                            setEditTaskDueDate(task.due_date ?? "")
                          }}
                          currentUserId={user?.uid}
                        />
                        {editingTaskId === task.id && (
                          <div className="card animate-fade-in" style={{ marginBottom: "0.75rem", marginTop: "-0.25rem", borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "2px solid var(--primary-lighter)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                              <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.375rem" }}><Edit2 size={14} /> Editar Tarea</h3>
                              <button className="btn-icon" onClick={() => setEditingTaskId(null)}><X size={14} /></button>
                            </div>
                            <input className="input" type="text" value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveTaskEdit()} style={{ marginBottom: "0.625rem" }} autoFocus />
                            <textarea className="textarea" rows={2} placeholder="Nota opcional..." value={editTaskNotes} onChange={(e) => setEditTaskNotes(e.target.value)} style={{ marginBottom: "0.625rem" }} />
                            <input type="date" className="input" value={editTaskDueDate} onChange={(e) => setEditTaskDueDate(e.target.value)} style={{ marginBottom: "0.625rem" }} />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.625rem" }}>
                              {iconEntries.map((key) => (
                                <button key={key} onClick={() => setEditTaskIcon(key)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: editTaskIcon === key ? "2px solid var(--primary)" : "2px solid transparent", background: editTaskIcon === key ? "var(--primary-lighter)" : "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <KawaiiIcon name={key} size={16} color={editTaskIcon === key ? "var(--primary)" : "var(--foreground-muted)"} />
                                </button>
                              ))}
                            </div>
                            <div className="form-actions">
                              <button className="btn btn-primary" onClick={handleSaveTaskEdit} disabled={updateTask.isPending}>{updateTask.isPending ? "Guardando..." : "Guardar"}</button>
                              <button className="btn btn-outline" onClick={() => setEditingTaskId(null)}>Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky add-task bar */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          left: 0, right: 0,
          padding: "0.5rem 1rem",
          background: "rgba(253,252,254,0.95)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid var(--border)",
          zIndex: 40,
        }}
      >
        <button
          className="btn btn-outline"
          onClick={() => setShowTaskForm(true)}
          style={{
            width: "100%",
            justifyContent: "flex-start",
            color: "var(--foreground-muted)",
            fontWeight: 400,
            fontSize: "0.875rem",
            gap: "0.5rem",
          }}
        >
          <Plus size={16} color="var(--primary)" />
          Añadir tarea...
        </button>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <div className="modal-overlay-bg" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><Edit2 size={16} /> Editar Plan</h2>
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
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                    <Image size={13} /> URL de portada (opcional)
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
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-light)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                    <Calendar size={13} /> Fecha objetivo (opcional)
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
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
                  {plan?.archived ? <><Upload size={14} /> Desarchivar</> : <><Archive size={14} /> Archivar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
