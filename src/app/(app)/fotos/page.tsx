"use client"

import React, { useState, useRef, useCallback } from "react"
import { usePhotos, useUploadPhoto, useDeletePhoto } from "@/hooks/use-photos"
import type { Photo } from "@/types"
import { Camera, Images, Trash2, X, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { toast } from "sonner"

type FilterType = "all" | "thingstodo" | "14feb"

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--muted)",
        borderRadius: "var(--radius-lg)",
        aspectRatio: "1 / 1",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  )
}

function PhotoCard({
  photo,
  onClick,
}: {
  photo: Photo
  onClick: () => void
}) {
  const date = new Date(photo.created_at).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  })

  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = "scale(1)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb_url ?? photo.image_url}
        alt={photo.caption ?? "Foto"}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          display: "block",
        }}
        loading="lazy"
      />
      <div style={{ padding: "0.5rem 0.625rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: "var(--foreground-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {photo.caption ?? " "}
          </span>
          <span
            style={{
              fontSize: "0.5625rem",
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: "999px",
              flexShrink: 0,
              background:
                photo.source === "14feb"
                  ? "linear-gradient(135deg, #EC4899, #F43F5E)"
                  : "linear-gradient(135deg, var(--primary), var(--secondary))",
              color: "white",
            }}
          >
            {photo.source === "14feb" ? "14F" : "TTD"}
          </span>
        </div>
        <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>{date}</p>
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
  const photo = photos[index]

  function prev() {
    setIndex((i) => (i > 0 ? i - 1 : photos.length - 1))
  }
  function next() {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : 0))
  }

  if (!photo) return null

  return (
    <div
      onClick={onClose}
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
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
          zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
          }}
        >
          <X size={20} />
        </button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem" }}>
          {index + 1} / {photos.length}
        </span>
        <button
          onClick={() => onDelete(photo.id)}
          disabled={deleting}
          style={{
            background: deleting ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.7)",
            border: "none",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: deleting ? "not-allowed" : "pointer",
            color: "white",
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Prev / Next */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              zIndex: 10,
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              zIndex: 10,
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
          style={{
            width: "100%",
            maxHeight: "70vh",
            objectFit: "contain",
            borderRadius: "var(--radius-lg)",
            display: "block",
          }}
        />
        {photo.caption && (
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              marginTop: "0.75rem",
              fontSize: "0.9375rem",
              fontWeight: 500,
            }}
          >
            {photo.caption}
          </p>
        )}
        {photo.uploaded_by_name && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              marginTop: "0.25rem",
              fontSize: "0.75rem",
            }}
          >
            Subida por {photo.uploaded_by_name}
          </p>
        )}
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
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(45,27,62,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: "0.375rem",
          }}
        >
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
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(caption.trim())
          }}
          style={{ marginBottom: "1rem" }}
        />
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => onConfirm(caption.trim())}
            disabled={uploading}
          >
            {uploading ? "Subiendo..." : "Subir"}
          </button>
          <button className="btn btn-outline" onClick={onCancel} disabled={uploading}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FotosPage() {
  const { data: photos, isLoading } = usePhotos()
  const uploadPhoto = useUploadPhoto()
  const deletePhoto = useDeletePhoto()

  const [filter, setFilter] = useState<FilterType>("all")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allPhotos = photos ?? []
  const has14Feb = allPhotos.some((p) => p.source === "14feb")

  const filteredPhotos =
    filter === "all"
      ? allPhotos
      : filter === "thingstodo"
      ? allPhotos.filter((p) => p.source === "thingstodo")
      : allPhotos.filter((p) => p.source === "14feb")

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setPendingFiles(files)
    e.target.value = ""
  }, [])

  async function handleUploadConfirm(caption: string) {
    if (!pendingFiles) return
    let successCount = 0
    for (const file of pendingFiles) {
      try {
        await uploadPhoto.mutateAsync({ file, caption: caption || undefined })
        successCount++
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al subir foto")
      }
    }
    if (successCount > 0) {
      toast.success(successCount === 1 ? "Foto subida!" : `${successCount} fotos subidas!`)
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.875rem",
        }}
      >
        <h1
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Camera size={22} />
          Nuestras Fotos
        </h1>
        {allPhotos.length > 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--foreground-muted)",
              background: "var(--muted)",
              borderRadius: "999px",
              padding: "3px 10px",
            }}
          >
            {allPhotos.length} foto{allPhotos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter pills */}
      {(allPhotos.length > 0 || isLoading) && filterPills.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "0.375rem",
            flexWrap: "wrap",
            marginBottom: "0.875rem",
            alignItems: "center",
          }}
        >
          <Filter size={13} color="var(--foreground-muted)" />
          {filterPills.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: "3px 12px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "0.6875rem",
                fontWeight: 600,
                background: filter === key ? "var(--primary)" : "var(--muted)",
                color: filter === key ? "white" : "var(--foreground-muted)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allPhotos.length === 0 && (
        <div className="empty-state" style={{ paddingTop: "3rem" }}>
          <div className="empty-icon animate-bounce-slow" style={{ color: "var(--foreground-muted)" }}>
            <Images size={48} />
          </div>
          <h2
            className="empty-title"
            style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", color: "var(--foreground)" }}
          >
            Aun no teneis fotos
          </h2>
          <p className="empty-text" style={{ color: "var(--foreground-muted)" }}>
            Sube vuestra primera foto juntos
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={16} /> Subir primera foto
          </button>
        </div>
      )}

      {/* Filtered empty state */}
      {!isLoading && allPhotos.length > 0 && filteredPhotos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" style={{ color: "var(--foreground-muted)" }}>
            <Images size={36} />
          </div>
          <p className="empty-text">No hay fotos con este filtro</p>
        </div>
      )}

      {/* Photo grid */}
      {!isLoading && filteredPhotos.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.75rem",
            paddingBottom: "6rem",
          }}
        >
          {filteredPhotos.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => {
                // Find index in filteredPhotos
                setLightboxIndex(i)
              }}
            />
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* FAB */}
      {!isLoading && (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            border: "none",
            borderRadius: "999px",
            padding: "0.875rem 1.25rem",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9375rem",
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
            zIndex: 50,
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
