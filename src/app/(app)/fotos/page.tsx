"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { usePhotos, useUploadPhoto, useDeletePhoto, useUpdatePhotoCaption, usePhotoReactions, useTogglePhotoReaction, type PhotoReaction } from "@/hooks/use-photos"
import type { Photo } from "@/types"
import { usePhotoComments, useAddPhotoComment, useDeletePhotoComment, type PhotoComment } from "@/hooks/use-photos"
import { Camera, Images, Trash2, X, ChevronLeft, ChevronRight, Calendar, LayoutGrid, Rows3, Download, Share2, CheckCircle2, Circle, Newspaper, Heart, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"

type FilterType = "all" | "thingstodo" | "14feb"
type ViewMode = "polaroid" | "masonry" | "feed"

function timeAgoEs(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "ahora"
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d} d`
  const w = Math.floor(d / 7)
  if (w < 5) return `hace ${w} sem`
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

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

const REACTION_EMOJIS = ["❤️", "🔥", "✨"] as const

function ReactionStrip({ photoId, reactions, myUid, onToggle }: {
  photoId: string
  reactions: PhotoReaction[]
  myUid: string
  onToggle: (emoji: string) => void
}) {
  const photoReactions = reactions.filter((r) => r.photo_id === photoId)
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ display: "flex", gap: "0.25rem", justifyContent: "center", marginTop: "4px" }}
    >
      {REACTION_EMOJIS.map((emoji) => {
        const mine = photoReactions.some((r) => r.emoji === emoji && r.user_id === myUid)
        const count = photoReactions.filter((r) => r.emoji === emoji).length
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            style={{
              background: mine ? "rgba(139,92,246,0.12)" : "rgba(0,0,0,0.04)",
              border: mine ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
              borderRadius: "999px",
              padding: "1px 6px",
              cursor: "pointer",
              fontSize: "0.75rem",
              display: "flex", alignItems: "center", gap: "2px",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#6d4d9e" }}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

function PolaroidCard({ photo, onClick, index, isNew, reactions, myUid, onReact, selectionMode, selected, onSelect, isMonthPhoto }: {
  photo: Photo; onClick: () => void; index: number; isNew?: boolean
  reactions: PhotoReaction[]; myUid: string; onReact: (emoji: string) => void
  selectionMode: boolean; selected: boolean; onSelect: () => void
  isMonthPhoto?: boolean
}) {
  const rotation = polaroidRotation(photo.id, index)
  const date = new Date(photo.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" })
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startPress() {
    longPressTimer.current = setTimeout(() => onSelect(), 500)
  }
  function cancelPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  return (
    <div
      className={`polaroid-card${isNew ? " polaroid-new-entry" : ""}`}
      onClick={selectionMode ? onSelect : onClick}
      onMouseDown={!selectionMode ? startPress : undefined}
      onMouseUp={cancelPress}
      onTouchStart={!selectionMode ? startPress : undefined}
      onTouchEnd={cancelPress}
      style={{
        padding: "10px 10px 32px",
        transform: selected ? "rotate(0deg) scale(0.95)" : `rotate(${rotation}deg)`,
        "--final-rot": `${rotation}deg`,
        outline: selected ? "3px solid var(--primary)" : "none",
        outlineOffset: "2px",
        transition: selectionMode ? "transform 0.15s, outline 0.15s" : undefined,
      } as React.CSSProperties}
      onMouseEnter={!selectionMode ? (e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = "rotate(0deg) scale(1.06)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.28)"
      } : undefined}
      onMouseLeave={(e) => {
        cancelPress()
        if (!selectionMode) {
          ;(e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg)`
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)"
        }
      }}
    >
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumb_url ?? photo.image_url}
          alt={photo.caption ?? "Foto"}
          style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
        {isMonthPhoto && !selectionMode && (
          <div style={{
            position: "absolute", top: 6, left: 6,
            background: "linear-gradient(135deg, #F59E0B, #EF4444)",
            borderRadius: "999px", padding: "2px 8px",
            fontSize: "0.625rem", fontWeight: 800, color: "white",
            letterSpacing: "0.03em", boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}>
            ⭐ Foto del mes
          </div>
        )}
        {selectionMode && (
          <div style={{ position: "absolute", top: 6, right: 6, color: selected ? "var(--primary)" : "rgba(255,255,255,0.8)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}>
            {selected ? <CheckCircle2 size={22} fill="white" /> : <Circle size={22} />}
          </div>
        )}
      </div>
      <div style={{ paddingTop: "8px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "0.9375rem", color: "#2a1a1a", lineHeight: 1.2, minHeight: "1.1rem" }}>
          {photo.caption || date}
        </p>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "0.6875rem", marginTop: "2px", color: photo.source === "14feb" ? "#EC4899" : "#8B5CF6" }}>
          {photo.source === "14feb" ? "14-Febrero" : "ThingsToDo"}
        </p>
        {!selectionMode && <ReactionStrip photoId={photo.id} reactions={reactions} myUid={myUid} onToggle={onReact} />}
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

const FEED_REACTIONS = ["❤️", "🔥", "✨"] as const

function FeedCard({ photo, onClick, reactions, commentCount, myUid, onReact, onOpenComments }: {
  photo: Photo; onClick: () => void
  reactions: PhotoReaction[]; commentCount: number; myUid: string
  onReact: (emoji: string) => void
  onOpenComments: () => void
}) {
  const appName = photo.source === "14feb" ? "14-Febrero" : "ThingsToDo"
  const uploaderName = photo.uploaded_by_name?.trim() || null
  const displayName = uploaderName ?? appName
  const avatarUrl = photo.uploaded_by_avatar?.trim() || null

  const photoReactions = reactions.filter((r) => r.photo_id === photo.id)
  const liked = photoReactions.some((r) => r.emoji === "❤️" && r.user_id === myUid)
  const likeCount = photoReactions.filter((r) => r.emoji === "❤️").length

  const [picker, setPicker] = useState(false)
  const [burst, setBurst] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  function startPress() {
    longPressed.current = false
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(40)
      setPicker(true)
    }, 480)
  }
  function endPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }

  function react(emoji: string) {
    if (emoji === "❤️" && !liked) { setBurst(true); setTimeout(() => setBurst(false), 600) }
    onReact(emoji)
    setPicker(false)
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginBottom: "1.25rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Post header — uploader avatar + name, app name small below */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", padding: 2, flexShrink: 0,
          background: photo.source === "14feb"
            ? "linear-gradient(135deg, #EC4899, #F472B6)"
            : "linear-gradient(135deg, var(--primary), var(--secondary))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--surface)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9375rem", fontWeight: 700, fontFamily: "'Fredoka', sans-serif", color: "var(--primary)" }}>
              {uploaderName ? uploaderName[0].toUpperCase() : (photo.source === "14feb" ? "💕" : "✨")}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.875rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </p>
          <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", lineHeight: 1.15 }}>
            {uploaderName ? `${appName} · ${timeAgoEs(photo.created_at)}` : timeAgoEs(photo.created_at)}
          </p>
        </div>
      </div>

      {/* Image — long-press to react, single tap opens lightbox */}
      <div
        onClick={() => { if (!longPressed.current) onClick() }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerMove={endPress}
        style={{ cursor: "pointer", position: "relative", userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image_url}
          alt={photo.caption ?? "Foto"}
          style={{ width: "100%", display: "block", maxHeight: "78vw", objectFit: "cover", pointerEvents: "none" }}
          loading="lazy"
        />
        {burst && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <Heart size={96} fill="#fff" color="#fff" style={{ animation: "lightboxImgIn 0.6s ease both", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }} />
          </div>
        )}

        {/* Long-press reaction picker */}
        {picker && (
          <>
            <div onClick={(e) => { e.stopPropagation(); setPicker(false) }}
              style={{ position: "fixed", inset: 0, zIndex: 49 }} />
            <div onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", left: "50%", bottom: "12px", transform: "translateX(-50%)",
                display: "flex", gap: "0.25rem", zIndex: 50,
                background: "rgba(255,255,255,0.96)", borderRadius: "999px", padding: "6px 10px",
                boxShadow: "0 8px 28px rgba(0,0,0,0.28)", animation: "modalIn 0.15s ease",
              }}>
              {FEED_REACTIONS.map((emoji) => {
                const mine = photoReactions.some((r) => r.emoji === emoji && r.user_id === myUid)
                return (
                  <button key={emoji} onClick={() => react(emoji)}
                    style={{
                      background: mine ? "rgba(139,92,246,0.15)" : "transparent",
                      border: "none", borderRadius: "50%", cursor: "pointer",
                      padding: "6px 8px", fontSize: "1.375rem", lineHeight: 1, transition: "transform 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Action bar — like + comment (reactions live in long-press) */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.125rem", padding: "0.5rem 0.875rem 0.25rem" }}>
        <button onClick={() => react("❤️")} aria-label="Me gusta"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", transition: "transform 0.15s" }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.8)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Heart size={24} fill={liked ? "#ef4444" : "none"} color={liked ? "#ef4444" : "var(--foreground)"} />
        </button>
        <button onClick={onOpenComments} aria-label="Comentarios"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <MessageCircle size={23} color="var(--foreground)" />
        </button>
      </div>

      {/* Likes count */}
      {likeCount > 0 && (
        <p style={{ padding: "0 0.875rem", fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground)" }}>
          {likeCount} Me gusta
        </p>
      )}

      {/* Caption */}
      {photo.caption && (
        <p style={{ padding: "0.25rem 0.875rem 0", fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, marginRight: "0.375rem" }}>{displayName}</span>
          {photo.caption}
        </p>
      )}

      {/* View comments link */}
      <button onClick={onOpenComments}
        style={{ background: "none", border: "none", padding: "0.375rem 0.875rem 0.75rem", cursor: "pointer", fontSize: "0.8125rem", color: "var(--foreground-muted)", fontFamily: "inherit", textAlign: "left", display: "block" }}>
        {commentCount > 0 ? `Ver ${commentCount === 1 ? "1 comentario" : `los ${commentCount} comentarios`}` : "Añade un comentario..."}
      </button>
    </div>
  )
}

// ── Comments bottom sheet ───────────────────────────────────────────────────
function CommentsSheet({ photo, comments, myUid, onClose, onAddComment, onDeleteComment }: {
  photo: Photo
  comments: PhotoComment[]
  myUid: string
  onClose: () => void
  onAddComment: (content: string) => Promise<void>
  onDeleteComment: (id: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [posting, setPosting] = useState(false)
  const photoComments = comments.filter((c) => c.photo_id === photo.id)

  async function submit() {
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true)
    try {
      await onAddComment(text)
      setDraft("")
    } catch {
      toast.error("No se pudo publicar el comentario")
    } finally {
      setPosting(false)
    }
  }

  return (
    <div onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          maxHeight: "72vh", display: "flex", flexDirection: "column",
          animation: "sheetUp 0.28s cubic-bezier(0.34,1.3,0.64,1) both",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        }}>
        {/* Grabber + title + close */}
        <div style={{ padding: "0.5rem 1rem 0.625rem", borderBottom: "1px solid var(--border)", flexShrink: 0, position: "relative" }}>
          <div onClick={onClose} style={{ width: 38, height: 4, borderRadius: 999, background: "var(--border)", margin: "0 auto 0.5rem", cursor: "pointer" }} />
          <p style={{ textAlign: "center", fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)" }}>
            Comentarios
          </p>
          <button onClick={onClose} aria-label="Cerrar"
            style={{
              position: "absolute", top: "0.5rem", right: "0.75rem",
              width: 30, height: 30, borderRadius: "50%", border: "none",
              background: "var(--muted)", color: "var(--foreground-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.875rem", overscrollBehavior: "contain" }}>
          {photoComments.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.8125rem", padding: "1.5rem 0" }}>
              Aún no hay comentarios. ¡Sé el primero! 💬
            </p>
          )}
          {photoComments.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.75rem", fontFamily: "'Fredoka', sans-serif" }}>
                {(c.user_name || "P")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, marginRight: "0.375rem" }}>{c.user_name || "Pareja"}</span>
                  {c.content}
                </p>
                <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>{timeAgoEs(c.created_at)}</p>
              </div>
              {c.user_id === myUid && (
                <button onClick={() => onDeleteComment(c.id)} aria-label="Eliminar"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--foreground-muted)", flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit() }}
            placeholder="Añade un comentario..."
            maxLength={500}
            autoFocus
            style={{
              flex: 1, border: "1px solid var(--border)", borderRadius: "999px",
              outline: "none", background: "var(--muted)", padding: "0.5rem 0.875rem",
              fontFamily: "inherit", fontSize: "0.8125rem", color: "var(--foreground)",
            }}
          />
          <button onClick={submit} disabled={!draft.trim() || posting}
            style={{
              background: draft.trim() ? "var(--primary)" : "var(--muted)",
              border: "none", borderRadius: "50%", width: 38, height: 38, flexShrink: 0,
              cursor: draft.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: draft.trim() ? "white" : "var(--foreground-muted)",
            }}>
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Lightbox({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onUpdateCaption,
  deleting,
}: {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onDelete: (id: string) => void
  onUpdateCaption: (id: string, caption: string | null) => Promise<void>
  deleting: boolean
}) {
  const [index, setIndex] = useState(initialIndex)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState("")
  const [savingCaption, setSavingCaption] = useState(false)
  // displayCaption tracks the saved caption locally so UI updates immediately
  const [displayCaption, setDisplayCaption] = useState<string | null>(null)
  const captionInputRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const photo = photos[index]

  // Sync displayCaption when navigating to another photo
  useEffect(() => { setDisplayCaption(photo?.caption ?? null) }, [photo?.id])

  function prev() { setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)); setEditingCaption(false) }
  function next() { setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)); setEditingCaption(false) }

  function startEdit() {
    setCaptionDraft(displayCaption ?? "")
    setEditingCaption(true)
    setTimeout(() => captionInputRef.current?.focus(), 50)
  }

  async function saveCaption() {
    if (savingCaption) return
    setSavingCaption(true)
    try {
      await onUpdateCaption(photo.id, captionDraft.trim() || null)
      setDisplayCaption(captionDraft.trim() || null)
    } catch {
      toast.error("No se pudo guardar el pie de foto")
    } finally {
      setSavingCaption(false)
      setEditingCaption(false)
    }
  }

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
      const { getFirebaseAuth } = await import("@/lib/firebase/client")
      const token = await getFirebaseAuth().currentUser?.getIdToken()
      const proxyUrl = `/api/photos/download?url=${encodeURIComponent(photo.image_url)}`
      const res = await fetch(proxyUrl, { headers: { Authorization: `Bearer ${token ?? ""}` } })
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = displayCaption ? `${displayCaption}.jpg` : `foto-${photo.id.slice(0, 8)}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Foto descargada ✅")
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
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "lightboxIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      {/* C1: Blurred photo backdrop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb_url ?? photo.image_url}
        alt=""
        aria-hidden
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", filter: "blur(28px) saturate(1.4)",
          opacity: 0.3, transform: "scale(1.08)",
          pointerEvents: "none",
        }}
      />
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
          key={photo.id}
          src={photo.image_url}
          alt={photo.caption ?? "Foto"}
          style={{ width: "100%", maxHeight: "68vh", objectFit: "contain", borderRadius: "var(--radius-lg)", display: "block", animation: "lightboxImgIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both" }}
        />
        {/* Editable caption */}
        <div style={{ marginTop: "0.625rem", textAlign: "center" }}>
          {editingCaption ? (
            <div style={{ display: "flex", gap: "0.375rem", alignItems: "center", justifyContent: "center" }}>
              <input
                ref={captionInputRef}
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveCaption(); if (e.key === "Escape") setEditingCaption(false) }}
                maxLength={120}
                placeholder="Pie de foto..."
                style={{
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "var(--radius-md)", color: "white", padding: "4px 10px",
                  fontFamily: "'Caveat', cursive", fontSize: "1rem", textAlign: "center",
                  outline: "none", width: "min(280px, 70vw)",
                }}
              />
              <button onClick={saveCaption} disabled={savingCaption}
                style={{ background: "var(--primary)", border: "none", borderRadius: "var(--radius-md)", color: "white", padding: "4px 12px", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600 }}>
                {savingCaption ? "..." : "OK"}
              </button>
            </div>
          ) : (
            <button onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
              <p style={{ fontFamily: "'Caveat', cursive", color: displayCaption ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", fontSize: "1.125rem", borderBottom: "1px dashed rgba(255,255,255,0.2)" }}>
                {displayCaption ?? "Toca para añadir pie de foto ✏️"}
              </p>
            </button>
          )}
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: "0.25rem", fontSize: "0.6875rem" }}>
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
  const updateCaption = useUpdatePhotoCaption()
  const toggleReaction = useTogglePhotoReaction()

  const [filter, setFilter] = useState<FilterType>("all")
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fotosView") as ViewMode) ?? "polaroid"
    }
    return "polaroid"
  })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [commentsPhotoId, setCommentsPhotoId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectionMode = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    let deleted = 0
    for (const id of selectedIds) {
      try {
        await deletePhoto.mutateAsync(id)
        deleted++
      } catch {
        // continue
      }
    }
    toast.success(`${deleted} foto${deleted !== 1 ? "s" : ""} eliminada${deleted !== 1 ? "s" : ""}`)
    setSelectedIds(new Set())
    setBulkDeleting(false)
  }

  const allPhotos = photos ?? []
  const has14Feb = allPhotos.some((p) => p.source === "14feb")
  const monthsCount = calcMonthsTogether(allPhotos)

  const filteredPhotos =
    filter === "all" ? allPhotos
    : filter === "thingstodo" ? allPhotos.filter((p) => p.source === "thingstodo")
    : allPhotos.filter((p) => p.source === "14feb")

  // F9: stats
  const now = new Date()
  const thisMonth = allPhotos.filter((p) => {
    const d = new Date(p.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const lastPhoto = allPhotos.length > 0 ? allPhotos.reduce((a, b) => a.created_at > b.created_at ? a : b) : null
  const daysSinceLast = lastPhoto ? Math.floor((now.getTime() - new Date(lastPhoto.created_at).getTime()) / 86400000) : null

  // F10: photo of the month — most recent photo in the current month
  const photoOfMonth = thisMonth.length > 0 ? thisMonth.reduce((a, b) => a.created_at > b.created_at ? a : b) : null

  const allPhotoIds = useMemo(() => allPhotos.map((p) => p.id), [allPhotos])
  const { data: reactions = [] } = usePhotoReactions(allPhotoIds)
  // Only fetch comments in feed view to avoid unnecessary requests
  const { data: comments = [] } = usePhotoComments(viewMode === "feed" ? allPhotoIds : [])
  const addComment = useAddPhotoComment()
  const deleteComment = useDeletePhotoComment()

  // Get current user UID from Firebase auth
  const [myUid, setMyUid] = useState("")
  useEffect(() => {
    import("@/lib/firebase/client").then(({ getFirebaseAuth }) => {
      const auth = getFirebaseAuth()
      setMyUid(auth.currentUser?.uid ?? "")
    })
  }, [])

  function toggleView() {
    const cycle: ViewMode[] = ["polaroid", "masonry", "feed"]
    const next = cycle[(cycle.indexOf(viewMode) + 1) % cycle.length]
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

      {/* F9: Stats strip */}
      {allPhotos.length > 0 && !isLoading && (
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "0.875rem", paddingBottom: "2px" }}>
          {thisMonth.length > 0 && (
            <span style={{ fontSize: "0.75rem", fontWeight: 600, background: "var(--primary-lighter)", color: "var(--primary)", borderRadius: "999px", padding: "4px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
              📸 {thisMonth.length} este mes
            </span>
          )}
          {daysSinceLast !== null && (
            <span style={{ fontSize: "0.75rem", fontWeight: 600, background: "var(--muted)", color: "var(--foreground-muted)", borderRadius: "999px", padding: "4px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
              {daysSinceLast === 0 ? "⚡ Último recuerdo: hoy" : daysSinceLast === 1 ? "⏰ Último: ayer" : `⏰ Último: hace ${daysSinceLast}d`}
            </span>
          )}
          <span style={{ fontSize: "0.75rem", fontWeight: 600, background: "var(--muted)", color: "var(--foreground-muted)", borderRadius: "999px", padding: "4px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
            🗓️ {allPhotos.length} en total
          </span>
        </div>
      )}

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
            title={viewMode === "polaroid" ? "Vista cuadrícula" : viewMode === "masonry" ? "Vista feed" : "Vista polaroid"}
            style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
              background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: "var(--foreground-muted)", flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {viewMode === "polaroid" ? <LayoutGrid size={15} /> : viewMode === "masonry" ? <Newspaper size={15} /> : <Rows3 size={15} />}
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
                      reactions={reactions}
                      myUid={myUid}
                      onReact={(emoji) => toggleReaction.mutate({ photoId: photo.id, emoji })}
                      selectionMode={selectionMode}
                      selected={selectedIds.has(photo.id)}
                      onSelect={() => toggleSelect(photo.id)}
                      isMonthPhoto={photoOfMonth?.id === photo.id}
                      onClick={() => {
                        if (selectionMode) { toggleSelect(photo.id); return }
                        setLightboxIndex(filteredPhotos.findIndex((p) => p.id === photo.id))
                      }}
                    />
                  ))}
                </div>
              ) : viewMode === "masonry" ? (
                <div style={{ columns: 2, columnGap: "0.625rem", padding: "0.25rem 0 0.75rem" }}>
                  {group.photos.map((photo) => (
                    <MasonryCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => setLightboxIndex(filteredPhotos.findIndex((p) => p.id === photo.id))}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ padding: "0.25rem 0 0.5rem" }}>
                  {group.photos.map((photo) => (
                    <FeedCard
                      key={photo.id}
                      photo={photo}
                      reactions={reactions}
                      commentCount={comments.filter((c) => c.photo_id === photo.id).length}
                      myUid={myUid}
                      onReact={(emoji) => toggleReaction.mutate({ photoId: photo.id, emoji })}
                      onOpenComments={() => setCommentsPhotoId(photo.id)}
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

      {/* Bulk delete bar */}
      {selectionMode && (
        <div style={{
          position: "fixed",
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          left: "50%", transform: "translateX(-50%)",
          background: "var(--foreground)", color: "white",
          borderRadius: "999px", padding: "0.75rem 1.5rem",
          display: "flex", alignItems: "center", gap: "1rem",
          zIndex: 60, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          fontFamily: "inherit",
        }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setSelectedIds(new Set())}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "999px", padding: "4px 12px", color: "white", cursor: "pointer", fontSize: "0.8125rem", fontFamily: "inherit" }}>
            Cancelar
          </button>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            style={{ background: "rgba(239,68,68,0.85)", border: "none", borderRadius: "999px", padding: "4px 14px", color: "white", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Trash2 size={14} />
            {bulkDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      )}

      {/* FAB */}
      {!isLoading && !selectionMode && (
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

      {/* Comments bottom sheet */}
      {commentsPhotoId && (() => {
        const photo = allPhotos.find((p) => p.id === commentsPhotoId)
        if (!photo) return null
        return (
          <CommentsSheet
            photo={photo}
            comments={comments}
            myUid={myUid}
            onClose={() => setCommentsPhotoId(null)}
            onAddComment={(content) => addComment.mutateAsync({ photoId: photo.id, content })}
            onDeleteComment={(id) => deleteComment.mutate(id)}
          />
        )
      })()}

      {/* Lightbox */}
      {lightboxIndex !== null && filteredPhotos.length > 0 && (
        <Lightbox
          photos={filteredPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          onUpdateCaption={async (id, caption) => {
            await updateCaption.mutateAsync({ id, caption })
            toast.success("Caption actualizado")
          }}
          deleting={deletePhoto.isPending}
        />
      )}
    </div>
  )
}
