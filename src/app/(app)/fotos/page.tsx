"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { usePhotos, useUploadPhoto, useDeletePhoto } from "@/hooks/use-photos"
import type { Photo } from "@/types"
import { Camera, Images, Trash2, X, ChevronLeft, ChevronRight, Calendar, LayoutGrid, Rows3, Download, Share2 } from "lucide-react"
import { toast } from "sonner"

type FilterType = "all" | "thingstodo" | "14feb"
type ViewMode = "polaroid" | "masonry"

function polaroidRotation(id: string, index: number): number {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const variation = (sum % 4) * 0.35
  return index % 2 === 0 ? 1.3 + variation : -(1.3 + variation)
}

function groupPhotosByMonth(photos: Photo[]): Array<{ monthLabel: string; photos: Photo[]; startIndex: number }> {
  const groups: Array<{ monthLabel: string; photos: Photo[]; startIndex: number }> = []
  const seen = new Map<string, number>()
  let globalIndex = 0
  for (const photo of photos) {
    const key = new Date(photo.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    if (!seen.has(key)) {
      seen.set(key, groups.length)
      groups.push({ monthLabel: key, photos: [], startIndex: globalIndex })
    }
    groups[seen.get(key)!].photos.push(photo)
    globalIndex++
  }
  return groups
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: "white",
        padding: "10px 10px 32px",
        borderRadius: "3px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div style={{ background: "var(--muted)", aspectRatio: "1/1", width: "100%" }} />
      <div style={{ height: 14, background: "var(--muted)", borderRadius: 4, marginTop: 10, width: "70%", margin: "10px auto 0" }} />
    </div>
  )
}

function PolaroidCard({ photo, onClick, index, isNew }: { photo: Photo; onClick: () => void; index: number; isNew?: boolean }) {
  const rotation = polaroidRotation(photo.id, index)
  const date = new Date(photo.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" })

  return (
    <div
      className={`polaroid-card${isNew ? " polaroid-new-entry" : ""}`}
      onClick={onClick}
      style={{ padding: "10px 10px 32px", transform: `rotate(${rotation}deg)`, "--final-rot": `${rotation}deg` } as React.CSSProperties}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = "rotate(0deg) scale(1.06)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.28)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg)`
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)"
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb_url ?? photo.image_url}
        alt={photo.caption ?? "Foto"}
        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
        loading="lazy"
      />
      <div style={{ paddingTop: "8px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "0.9375rem", color: "#2a1a1a", lineHeight: 1.2, minHeight: "1.1rem" }}>
          {photo.caption || date}
        </p>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "0.6875rem", marginTop: "2px", color: photo.source === "14feb" ? "#EC4899" : "#8B5CF6" }}>
          {photo.source === "14feb" ? "14-Febrero" : "ThingsToDo"}
        </p>
      </div>
    </div>
  )
}

function MasonryCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const date = new Date(photo.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        breakInside: "avoid",
        marginBottom: "0.625rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.025)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.22)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)"
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb_url ?? photo.image_url}
        alt={photo.caption ?? "Foto"}
        style={{ width: "100%", display: "block", objectFit: "cover" }}
        loading="lazy"
      />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
        padding: "1.25rem 0.625rem 0.5rem",
      }}>
        <p style={{ color: "white", fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.2 }}>
          {photo.caption || date}
        </p>
        <p style={{ color: photo.source === "14feb" ? "#f9a8d4" : "#c4b5fd", fontSize: "0.625rem", marginTop: "1px" }}>
          {photo.source === "14feb" ? "14-Febrero" : "ThingsToDo"}
        </p>
      </div>
    </div>
  )
}

function Lightbox({
  photos,
  initialIndex,
  onClose,
  onDelete,
  deleting,
}: {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onDelete: (id: string) => void
  deleting: boolean
}) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const photo = photos[index]

  function prev() { setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)) }
  function next() { setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)) }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx > 0) prev()
      else next()
    }
  }

  async function handleDownload() {
    try {
      const res = await fetch(photo.image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = photo.caption ? `${photo.caption}.jpg` : `foto-${photo.id.slice(0, 8)}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("No se pudo descargar la foto")
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: photo.caption ?? "Nuestra foto",
          text: photo.caption ?? "Mira esta foto 📷",
          url: photo.image_url,
        })
      } else {
        await navigator.clipboard.writeText(photo.image_url)
        toast.success("Enlace copiado al portapapeles")
      }
    } catch {
      // user cancelled share — no error needed
    }
  }

  if (!photo) return null

  return (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Top controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem", zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white",
          }}
        >
          <X size={20} />
        </button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem" }}>
          {index + 1} / {photos.length}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleShare}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white",
            }}
          >
            <Share2 size={17} />
          </button>
          <button
            onClick={handleDownload}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white",
            }}
          >
            <Download size={17} />
          </button>
          <button
            onClick={() => onDelete(photo.id)}
            disabled={deleting}
            style={{
              background: deleting ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.7)",
              border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: deleting ? "not-allowed" : "pointer", color: "white",
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            style={{
              position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white", zIndex: 10,
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            style={{
              position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white", zIndex: 10,
            }}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Image */}
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "min(90vw, 700px)", width: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image_url}
          alt={photo.caption ?? "Foto"}
          style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--radius-lg)", display: "block" }}
        />
        {photo.caption && (
          <p style={{ fontFamily: "'Caveat', cursive", color: "rgba(255,255,255,0.9)", textAlign: "center", marginTop: "0.75rem", fontSize: "1.125rem" }}>
            {photo.caption}
          </p>
        )}
        <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: "0.25rem", fontSize: "0.75rem" }}>
          {photo.source === "14feb" ? "14-Febrero" : "ThingsToDo"}
        </p>
      </div>
    </div>
  )
}

function CaptionDialog({
  files,
  onConfirm,
  onCancel,
  uploading,
}: {
  files: File[]
  onConfirm: (caption: string) => void
  onCancel: () => void
  uploading: boolean
}) {
  const [caption, setCaption] = useState("")

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(45,27,62,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "1.5rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "var(--radius-lg)", padding: "1.5rem",
          width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.375rem" }}>
          <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          {files.length === 1 ? "Subir foto" : `Subir ${files.length} fotos`}
        </h3>
        <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
          Agrega un pie de foto (opcional)
        </p>
        <input
          className="input"
          type="text"
          placeholder="Ej: Nuestra cena romántica..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={120}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(caption.trim()) }}
          style={{ marginBottom: "1rem" }}
        />
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onConfirm(caption.trim())} disabled={uploading}>
            {uploading ? "Subiendo..." : "Subir"}
          </button>
          <button className="btn btn-outline" onClick={onCancel} disabled={uploading}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function calcMonthsTogether(photos: Photo[]): number {
  if (photos.length === 0) return 0
  const oldest = photos.reduce((a, b) => a.created_at < b.created_at ? a : b)
  const start = new Date(oldest.created_at)
  const now = new Date()
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
}

export default function FotosPage() {
  const { data: photos, isLoading } = usePhotos()
  const uploadPhoto = useUploadPhoto()
  const deletePhoto = useDeletePhoto()

  const [filter, setFilter] = useState<FilterType>("all")
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fotosView") as ViewMode) ?? "polaroid"
    }
    return "polaroid"
  })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allPhotos = photos ?? []
  const has14Feb = allPhotos.some((p) => p.source === "14feb")
  const monthsCount = calcMonthsTogether(allPhotos)

  const filteredPhotos =
    filter === "all" ? allPhotos
    : filter === "thingstodo" ? allPhotos.filter((p) => p.source === "thingstodo")
    : allPhotos.filter((p) => p.source === "14feb")

  function toggleView() {
    const next: ViewMode = viewMode === "polaroid" ? "masonry" : "polaroid"
    setViewMode(next)
    localStorage.setItem("fotosView", next)
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setPendingFiles(files)
    e.target.value = ""
  }, [])

  async function handleUploadConfirm(caption: string) {
    if (!pendingFiles) return
    let successCount = 0
    const freshIds: string[] = []
    for (const file of pendingFiles) {
      try {
        const result = await uploadPhoto.mutateAsync({ file, caption: caption || undefined })
        successCount++
        if (result?.id) freshIds.push(result.id)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al subir foto")
      }
    }
    if (successCount > 0) {
      toast.success(successCount === 1 ? "Foto subida!" : `${successCount} fotos subidas!`)
      if (freshIds.length > 0) {
        setNewPhotoIds((prev) => new Set([...prev, ...freshIds]))
        setTimeout(() => setNewPhotoIds((prev) => {
          const next = new Set(prev)
          freshIds.forEach((id) => next.delete(id))
          return next
        }), 1500)
      }
    }
    setPendingFiles(null)
  }

  async function handleDelete(id: string) {
    try {
      await deletePhoto.mutateAsync(id)
      toast.success("Foto eliminada")
      setLightboxIndex(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  const filterPills: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "thingstodo", label: "ThingsToDo" },
    ...(has14Feb ? [{ key: "14feb" as FilterType, label: "14-Febrero" }] : []),
  ]

  return (
    <div className="page-container">
      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
        borderRadius: "var(--radius-xl)",
        padding: "1.25rem 1.375rem 1.125rem",
        marginBottom: "1rem",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -24, right: -24, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -28, right: 50, width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          <div>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, opacity: 0.8, letterSpacing: "0.08em", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Galería
            </p>
            <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1, marginBottom: "0.75rem" }}>
              Nuestros<br />Recuerdos ✨
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, background: "rgba(255,255,255,0.22)", borderRadius: "999px", padding: "3px 10px" }}>
                📷 {allPhotos.length} foto{allPhotos.length !== 1 ? "s" : ""}
              </span>
              {monthsCount > 0 && (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, background: "rgba(255,255,255,0.22)", borderRadius: "999px", padding: "3px 10px" }}>
                  💕 {monthsCount} {monthsCount === 1 ? "mes" : "meses"} juntos
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: "3rem", lineHeight: 1, marginTop: "0.25rem", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.18))" }}>
            📷
          </div>
        </div>
      </div>

      {/* Filter pills + view toggle */}
      {(allPhotos.length > 0 || isLoading) && (
        <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.875rem", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", flex: 1 }}>
            {filterPills.length > 1 && filterPills.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "3px 12px", borderRadius: "999px", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                  background: filter === key ? "var(--primary)" : "var(--muted)",
                  color: filter === key ? "white" : "var(--foreground-muted)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={toggleView}
            title={viewMode === "polaroid" ? "Vista cuadrícula" : "Vista polaroid"}
            style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
              background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: "var(--foreground-muted)", flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {viewMode === "polaroid" ? <LayoutGrid size={15} /> : <Rows3 size={15} />}
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem", padding: "0.5rem 0.25rem" }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allPhotos.length === 0 && (
        <div className="empty-state" style={{ paddingTop: "3rem" }}>
          <div className="empty-icon animate-bounce-slow" style={{ color: "var(--foreground-muted)" }}>
            <Images size={48} />
          </div>
          <h2 className="empty-title" style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", color: "var(--foreground)" }}>
            Aún no tenéis fotos
          </h2>
          <p className="empty-text" style={{ color: "var(--foreground-muted)" }}>Sube vuestra primera foto juntos</p>
          <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} onClick={() => fileInputRef.current?.click()}>
            <Camera size={16} /> Subir primera foto
          </button>
        </div>
      )}

      {/* Filtered empty state */}
      {!isLoading && allPhotos.length > 0 && filteredPhotos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" style={{ color: "var(--foreground-muted)" }}><Images size={36} /></div>
          <p className="empty-text">No hay fotos con este filtro</p>
        </div>
      )}

      {/* Photo grid grouped by month */}
      {!isLoading && filteredPhotos.length > 0 && (
        <div style={{ paddingBottom: "6rem" }}>
          {groupPhotosByMonth(filteredPhotos).map((group) => (
            <div key={group.monthLabel}>
              <div className="month-separator">
                <Calendar size={14} />
                {group.monthLabel}
              </div>
              {viewMode === "polaroid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", padding: "0.5rem 0.5rem 1rem" }}>
                  {group.photos.map((photo, i) => (
                    <PolaroidCard
                      key={photo.id}
                      photo={photo}
                      index={group.startIndex + i}
                      isNew={newPhotoIds.has(photo.id)}
                      onClick={() => setLightboxIndex(filteredPhotos.findIndex((p) => p.id === photo.id))}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ columns: 2, columnGap: "0.625rem", padding: "0.25rem 0 0.75rem" }}>
                  {group.photos.map((photo) => (
                    <MasonryCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => setLightboxIndex(filteredPhotos.findIndex((p) => p.id === photo.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileChange} />

      {/* FAB */}
      {!isLoading && (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            position: "fixed",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            right: 24,
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            border: "none", borderRadius: "999px", padding: "0.875rem 1.25rem",
            color: "white", display: "flex", alignItems: "center", gap: "0.5rem",
            fontSize: "0.9375rem", fontWeight: 700, fontFamily: "inherit",
            cursor: "pointer", zIndex: 50,
            boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
          }}
        >
          <Camera size={18} />
          Subir
        </button>
      )}

      {/* Caption dialog */}
      {pendingFiles && (
        <CaptionDialog
          files={pendingFiles}
          onConfirm={handleUploadConfirm}
          onCancel={() => setPendingFiles(null)}
          uploading={uploadPhoto.isPending}
        />
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && filteredPhotos.length > 0 && (
        <Lightbox
          photos={filteredPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          deleting={deletePhoto.isPending}
        />
      )}
    </div>
  )
}
