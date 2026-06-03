"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react"
import {
  usePhotos, useUploadPhoto, useDeletePhoto, useUpdatePhotoCaption,
  usePhotoReactions, useTogglePhotoReaction, type PhotoReaction,
  useMarkPhotoViewed, usePhotoViews, type PhotoViewData,
  usePhotoAlbums, useCreatePhotoAlbum, useDeletePhotoAlbum, useUpdatePhotoAlbum, type PhotoAlbum,
} from "@/hooks/use-photos"
import { useQueryClient } from "@tanstack/react-query"
import type { Photo } from "@/types"
import {
  usePhotoComments, useAddPhotoComment, useDeletePhotoComment, type PhotoComment,
} from "@/hooks/use-photos"
import {
  Camera, Images, Trash2, X, ChevronLeft, ChevronRight, Calendar,
  LayoutGrid, Rows3, Download, Share2, CheckCircle2, Circle, Newspaper,
  Heart, MessageCircle, Send, Search, CornerDownRight, FolderOpen, Plus, Folder,
} from "lucide-react"
import { toast } from "sonner"

type FilterType = "all" | "thingstodo" | "14feb"
type ViewMode = "polaroid" | "masonry" | "feed" | "albums"

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

// ── Multi-photo feed grouping ──────────────────────────────────────────────
type FeedPost = {
  id: string        // group_id if group, else photo.id
  photos: Photo[]   // sorted by created_at asc within group
  isGroup: boolean
}

function groupPhotosIntoPosts(photos: Photo[]): FeedPost[] {
  const grouped = new Map<string, Photo[]>()
  const solos: Photo[] = []

  for (const p of photos) {
    if (p.group_id) {
      const arr = grouped.get(p.group_id) ?? []
      arr.push(p)
      grouped.set(p.group_id, arr)
    } else {
      solos.push(p)
    }
  }

  const posts: FeedPost[] = []
  for (const [gid, gPhotos] of grouped.entries()) {
    const sorted = [...gPhotos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sorted.length >= 2) {
      posts.push({ id: gid, photos: sorted, isGroup: true })
    } else {
      solos.push(sorted[0])
    }
  }
  for (const p of solos) posts.push({ id: p.id, photos: [p], isGroup: false })

  return posts.sort((a, b) => new Date(b.photos[0].created_at).getTime() - new Date(a.photos[0].created_at).getTime())
}

function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const [idx, setIdx] = useState(0)
  const [imgLoading, setImgLoading] = useState(false)
  const touchStartX = useRef<number>(0)

  function prev() { setIdx((i) => (i - 1 + photos.length) % photos.length); setImgLoading(true) }
  function next() { setIdx((i) => (i + 1) % photos.length); setImgLoading(true) }

  // Preload next image so switching feels instant
  const nextSrc = photos[(idx + 1) % photos.length]?.medium_url ?? photos[(idx + 1) % photos.length]?.image_url
  useEffect(() => {
    if (!nextSrc || photos.length < 2) return
    const img = new Image()
    img.src = nextSrc
  }, [nextSrc, photos.length])

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{ overflow: "hidden", position: "relative" }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const delta = e.changedTouches[0].clientX - touchStartX.current
          if (delta < -40) next()
          else if (delta > 40) prev()
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photos[idx].id}
          src={photos[idx].medium_url ?? photos[idx].image_url}
          alt={photos[idx].caption ?? ""}
          decoding="async"
          onLoad={() => setImgLoading(false)}
          style={{
            width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block",
            animation: "imgFadeIn 0.25s ease forwards",
          }}
        />
        {imgLoading && (
          <div style={{
            position: "absolute", inset: 0, background: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div className="skeleton" style={{ position: "absolute", inset: 0 }} />
          </div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", borderRadius: "999px", padding: "2px 8px", color: "white", fontSize: "0.6875rem", fontWeight: 700 }}>
          {idx + 1}/{photos.length}
        </div>
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, padding: "6px 0 2px" }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 16 : 6, height: 6, borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
                background: i === idx ? "var(--primary)" : "var(--border)",
                transition: "width 0.2s, background 0.2s",
              }}
            />
          ))}
        </div>
      )}
      {photos[idx].caption && (
        <p style={{ padding: "4px 12px 0", fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>{photos[idx].uploaded_by_name ?? "Nosotros"}</span>{" "}{photos[idx].caption}
        </p>
      )}
    </div>
  )
}

// F5: Double-tap to like FeedCard
function FeedCard({ photo, onClick, reactions, commentCount, myUid, onReact, onOpenComments, partnerViewed, groupPhotos }: {
  photo: Photo; onClick: () => void
  reactions: PhotoReaction[]; commentCount: number; myUid: string
  onReact: (emoji: string) => void
  onOpenComments: () => void
  partnerViewed?: boolean
  groupPhotos?: Photo[]
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
  // F5: track last tap time for double-tap detection
  const lastTapTime = useRef<number>(0)

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

  // F5: handle tap — detect double-tap within 300ms
  function handleTap() {
    if (longPressed.current) return
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      // Double-tap: like with heart burst
      lastTapTime.current = 0
      if (!liked) {
        setBurst(true)
        setTimeout(() => setBurst(false), 700)
        onReact("❤️")
      } else {
        setBurst(true)
        setTimeout(() => setBurst(false), 700)
      }
    } else {
      lastTapTime.current = now
      // Single tap: open lightbox after short delay to allow double-tap
      setTimeout(() => {
        if (Date.now() - lastTapTime.current >= 290) {
          onClick()
        }
      }, 310)
    }
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
      {/* Post header */}
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

      {/* Image — for group posts show carousel; for solo use double-tap to like / single tap lightbox */}
      {groupPhotos ? (
        <div style={{ position: "relative" }}>
          <PhotoCarousel photos={groupPhotos} />
          {/* Long-press reaction picker overlay for group posts */}
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
      ) : (
        <div
          onClick={handleTap}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerCancel={endPress}
          onPointerMove={endPress}
          style={{ cursor: "pointer", position: "relative", userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.medium_url ?? photo.image_url}
            alt={photo.caption ?? "Foto"}
            decoding="async"
            loading="lazy"
            style={{ width: "100%", display: "block", maxHeight: "78vw", objectFit: "cover", pointerEvents: "none", animation: "imgFadeIn 0.3s ease" }}
          />
          {burst && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <Heart size={96} fill="#ef4444" color="#ef4444" style={{ animation: "lightboxImgIn 0.6s ease both", filter: "drop-shadow(0 4px 12px rgba(239,68,68,0.6))" }} />
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
      )}

      {/* Action bar */}
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

      {/* Likes count + partner viewed indicator */}
      <div style={{ padding: "0 0.875rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {likeCount > 0 && (
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground)" }}>
            {likeCount} Me gusta
          </p>
        )}
        {/* F9: partner viewed indicator */}
        {partnerViewed && (
          <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
            👁 visto
          </p>
        )}
      </div>

      {/* Caption — for group posts the caption is rendered inside PhotoCarousel */}
      {!groupPhotos && photo.caption && (
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

// ── Comments bottom sheet (F8 — replies) ────────────────────────────────────
function CommentsSheet({ photo, comments, myUid, onClose, onAddComment, onDeleteComment }: {
  photo: Photo
  comments: PhotoComment[]
  myUid: string
  onClose: () => void
  onAddComment: (content: string, parentCommentId?: string | null) => Promise<void>
  onDeleteComment: (id: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [posting, setPosting] = useState(false)
  // F8: reply state
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const photoComments = comments.filter((c) => c.photo_id === photo.id)

  function startReply(commentId: string, userName: string) {
    setReplyingTo({ id: commentId, name: userName })
    setDraft(`@${userName} `)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function cancelReply() {
    setReplyingTo(null)
    setDraft("")
  }

  async function submit() {
    const text = draft.trim()
    if (!text || posting) return
    setPosting(true)
    try {
      await onAddComment(text, replyingTo?.id ?? null)
      setDraft("")
      setReplyingTo(null)
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
            <div key={c.id}>
              {/* Top-level comment */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.75rem", fontFamily: "'Fredoka', sans-serif" }}>
                  {(c.user_name || "P")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, marginRight: "0.375rem" }}>{c.user_name || "Pareja"}</span>
                    {c.content}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.125rem" }}>
                    <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{timeAgoEs(c.created_at)}</p>
                    {/* F8: Reply button */}
                    <button
                      onClick={() => startReply(c.id, c.user_name || "Pareja")}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 600, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "2px" }}
                    >
                      <CornerDownRight size={10} />
                      Responder
                    </button>
                  </div>
                </div>
                {c.user_id === myUid && (
                  <button onClick={() => onDeleteComment(c.id)} aria-label="Eliminar"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--foreground-muted)", flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {/* F8: Replies indented */}
              {c.replies && c.replies.length > 0 && (
                <div style={{ marginLeft: "2.375rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.625rem", paddingLeft: "8px", borderLeft: "2px solid var(--border)" }}>
                  {c.replies.map((reply) => (
                    <div key={reply.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--secondary), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.625rem", fontFamily: "'Fredoka', sans-serif" }}>
                        {(reply.user_name || "P")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--foreground)", lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 700, marginRight: "0.375rem" }}>{reply.user_name || "Pareja"}</span>
                          {reply.content}
                        </p>
                        <p style={{ fontSize: "0.5625rem", color: "var(--foreground-muted)", marginTop: "0.0625rem" }}>{timeAgoEs(reply.created_at)}</p>
                      </div>
                      {reply.user_id === myUid && (
                        <button onClick={() => onDeleteComment(reply.id)} aria-label="Eliminar"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--foreground-muted)", flexShrink: 0 }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div style={{ padding: "0.375rem 1rem", background: "var(--muted)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
              Respondiendo a <span style={{ fontWeight: 700, color: "var(--primary)" }}>{replyingTo.name}</span>
            </p>
            <button onClick={cancelReply} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--foreground-muted)" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit() }}
            placeholder={replyingTo ? `Responder a @${replyingTo.name}...` : "Añade un comentario..."}
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

// ── Lightbox (F10 pinch-to-zoom, F11 reactions+comments panel) ─────────────
function Lightbox({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onUpdateCaption,
  deleting,
  reactions,
  myUid,
  onReact,
  onOpenComments,
  comments,
  onMarkViewed,
}: {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onDelete: (id: string) => void
  onUpdateCaption: (id: string, caption: string | null) => Promise<void>
  deleting: boolean
  reactions: PhotoReaction[]
  myUid: string
  onReact: (photoId: string, emoji: string) => void
  onOpenComments: (photoId: string) => void
  comments: PhotoComment[]
  onMarkViewed: (photoId: string) => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState("")
  const [savingCaption, setSavingCaption] = useState(false)
  const [displayCaption, setDisplayCaption] = useState<string | null>(null)
  const captionInputRef = useRef<HTMLInputElement>(null)

  // F10: pinch-to-zoom state
  const [scale, setScale] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const initialPinchDistance = useRef<number | null>(null)
  const initialScale = useRef(1)
  const lastPanX = useRef(0)
  const lastPanY = useRef(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isPinching = useRef(false)
  // F10: double-tap reset
  const lastTapTime = useRef(0)

  const photo = photos[index]

  useEffect(() => {
    setDisplayCaption(photo?.caption ?? null)
    // F9: mark as viewed when opening
    if (photo?.id) onMarkViewed(photo.id)
    // Reset zoom when switching photos
    setScale(1)
    setPanX(0)
    setPanY(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id])

  function prev() {
    if (scale > 1) return // disable nav when zoomed
    setIndex((i) => (i > 0 ? i - 1 : photos.length - 1))
    setEditingCaption(false)
  }
  function next() {
    if (scale > 1) return
    setIndex((i) => (i < photos.length - 1 ? i + 1 : 0))
    setEditingCaption(false)
  }

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

  // F10: touch handlers
  function getTouchDistance(touches: React.TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      isPinching.current = true
      initialPinchDistance.current = getTouchDistance(e.touches)
      initialScale.current = scale
    } else if (e.touches.length === 1) {
      isPinching.current = false
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      lastPanX.current = panX
      lastPanY.current = panY
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      e.preventDefault()
      const dist = getTouchDistance(e.touches)
      const ratio = dist / initialPinchDistance.current
      const newScale = Math.min(4, Math.max(1, initialScale.current * ratio))
      setScale(newScale)
    } else if (e.touches.length === 1 && scale > 1) {
      // Panning when zoomed
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      setPanX(lastPanX.current + dx)
      setPanY(lastPanY.current + dy)
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (isPinching.current) {
      isPinching.current = false
      initialPinchDistance.current = null
      if (scale < 1.05) { setScale(1); setPanX(0); setPanY(0) }
      return
    }
    if (e.changedTouches.length === 1 && scale <= 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
      if (Math.abs(dx) > 50 && dy < 80) {
        if (dx > 0) prev()
        else next()
      }
    }
  }

  // F10: double-tap on image resets zoom
  function handleImageTap() {
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      setScale(1)
      setPanX(0)
      setPanY(0)
    }
    lastTapTime.current = now
  }

  async function handleDownload() {
    try {
      const { getFirebaseToken } = await import("@/lib/firebase/client")
      const token = await getFirebaseToken()
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

  // F11: reactions + comments for current photo
  const photoReactions = reactions.filter((r) => r.photo_id === photo.id)
  const photoComments = comments.filter((c) => c.photo_id === photo.id)
  const topComments = photoComments.slice(0, 3)

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
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
        animation: "lightboxIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
        touchAction: "none",
      }}
    >
      {/* Blurred backdrop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumb_url ?? photo.image_url}
        alt=""
        aria-hidden
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", filter: "blur(28px) saturate(1.4)",
          opacity: 0.2, transform: "scale(1.08)",
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
      {photos.length > 1 && scale <= 1 && (
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

      {/* Main content area */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxHeight: "100vh", overflow: "hidden" }}>
        {/* Image with pinch-to-zoom */}
        <div
          onClick={(e) => { e.stopPropagation(); handleImageTap() }}
          style={{
            maxWidth: "min(90vw, 700px)", width: "100%",
            display: "flex", flexDirection: "column", alignItems: "center",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.id}
            src={photo.image_url}
            alt={photo.caption ?? "Foto"}
            style={{
              width: "100%", maxHeight: "55vh", objectFit: "contain",
              borderRadius: "var(--radius-lg)", display: "block",
              animation: "lightboxImgIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
              transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`,
              transformOrigin: "center center",
              transition: isPinching.current ? "none" : "transform 0.1s ease",
              touchAction: "none",
              userSelect: "none",
            }}
            draggable={false}
          />
          {/* Editable caption */}
          <div style={{ marginTop: "0.625rem", textAlign: "center", width: "100%" }}>
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
          {scale > 1 && (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.625rem", marginTop: "0.25rem" }}>
              Doble toque para resetear zoom
            </p>
          )}
        </div>

        {/* F11: Bottom panel — reactions + comments */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: "min(90vw, 700px)",
            background: "rgba(0,0,0,0.7)",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
            padding: "0.75rem 1rem",
            marginTop: "0.5rem",
          }}
        >
          {/* Reaction row */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.625rem", flexWrap: "wrap" }}>
            {REACTION_EMOJIS.map((emoji) => {
              const mine = photoReactions.some((r) => r.emoji === emoji && r.user_id === myUid)
              const count = photoReactions.filter((r) => r.emoji === emoji).length
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(photo.id, emoji)}
                  style={{
                    background: mine ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.12)",
                    border: mine ? "1px solid rgba(139,92,246,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "999px",
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "white",
                    display: "flex", alignItems: "center", gap: "4px",
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Top comments */}
          {topComments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "0.5rem" }}>
              {topComments.map((c) => (
                <p key={c.id} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, marginRight: "0.375rem" }}>{c.user_name || "Pareja"}</span>
                  {c.content}
                </p>
              ))}
              {photoComments.length > 3 && (
                <button
                  onClick={() => onOpenComments(photo.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", padding: 0, fontFamily: "inherit", textAlign: "left" }}
                >
                  Ver todos ({photoComments.length}) comentarios
                </button>
              )}
            </div>
          )}

          {/* Comment + add comment */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => onOpenComments(photo.id)}
              style={{
                flex: 1, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "999px", padding: "0.375rem 0.875rem",
                color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontFamily: "inherit",
                cursor: "pointer", textAlign: "left",
              }}
            >
              {photoComments.length === 0 ? "Añade un comentario..." : `Ver ${photoComments.length} comentario${photoComments.length !== 1 ? "s" : ""}...`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── F13: Image editor modal (crop/rotate before upload) ─────────────────────
// Inner editor content — reusable without the full-screen backdrop
function ImageEditorContent({ file, onConfirm, onSkip, onCancel }: {
  file: File
  onConfirm: (editedFile: File) => void
  onSkip: () => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => { imgRef.current = img; drawCanvas(img, rotation, flipH) }
    img.src = url
    return () => URL.revokeObjectURL(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  function drawCanvas(img: HTMLImageElement, rot: number, flip: boolean) {
    const canvas = canvasRef.current
    if (!canvas) return
    const isTransposed = rot === 90 || rot === 270
    canvas.width = isTransposed ? img.naturalHeight : img.naturalWidth
    canvas.height = isTransposed ? img.naturalWidth : img.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rot * Math.PI) / 180)
    if (flip) ctx.scale(-1, 1)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    ctx.restore()
  }

  function rotate() {
    const newRot = (rotation + 90) % 360
    setRotation(newRot)
    if (imgRef.current) drawCanvas(imgRef.current, newRot, flipH)
  }

  function flip() {
    const newFlip = !flipH
    setFlipH(newFlip)
    if (imgRef.current) drawCanvas(imgRef.current, rotation, newFlip)
  }

  function confirm() {
    const canvas = canvasRef.current
    if (!canvas) { onSkip(); return }
    canvas.toBlob((blob) => {
      if (!blob) { onSkip(); return }
      const editedFile = new File([blob], file.name, { type: "image/jpeg" })
      onConfirm(editedFile)
    }, "image/jpeg", 0.92)
  }

  return (
    <div
      style={{
        background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "1.25rem",
        width: "100%",
      }}
    >
      <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.0625rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.875rem" }}>
        Editar foto ✏️
      </h3>

      {/* Canvas preview */}
      <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "0.875rem", background: "var(--muted)", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "40vh", display: "block", margin: "0 auto" }} />
        {!previewUrl && <p style={{ color: "var(--foreground-muted)", fontSize: "0.8125rem" }}>Cargando...</p>}
      </div>

      {/* Edit buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={rotate}
          className="btn btn-outline"
          style={{ flex: 1, fontSize: "0.8125rem" }}
        >
          ↻ Rotar 90°
        </button>
        <button
          onClick={flip}
          className="btn btn-outline"
          style={{ flex: 1, fontSize: "0.8125rem" }}
        >
          ⇆ Voltear
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.625rem" }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirm}>
          Aplicar
        </button>
        <button className="btn btn-outline" onClick={onSkip}>
          Saltar esta
        </button>
      </div>
      <button
        onClick={onCancel}
        style={{ background: "none", border: "none", color: "var(--foreground-muted)", fontSize: "0.75rem", cursor: "pointer", marginTop: "0.5rem", fontFamily: "inherit", display: "block", textAlign: "center", width: "100%" }}
      >
        Cancelar
      </button>
    </div>
  )
}

function ImageEditorModal({ file, onConfirm, onSkip, onCancel }: {
  file: File
  onConfirm: (editedFile: File) => void
  onSkip: () => void
  onCancel: () => void
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 350,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", borderRadius: "var(--radius-lg)" }}>
        <ImageEditorContent file={file} onConfirm={onConfirm} onSkip={onSkip} onCancel={onCancel} />
      </div>
    </div>
  )
}

// ── Stable blob-URL thumbnail for review grid (avoids re-creating URLs on every render) ──
function ReviewThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return (
    <div style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--muted)" }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <button
        onClick={onRemove}
        style={{
          position: "absolute", top: 4, right: 4,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(239,68,68,0.9)", border: "none",
          color: "white", fontSize: "0.75rem", fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >✕</button>
    </div>
  )
}

// ── Wizard step indicator ────────────────────────────────────────────────────
function WizardHeader({ step, total }: { step: number; total: number }) {
  const labels = ["Revisar", "Editar", "Detalles", "Subiendo"]
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "0.875rem 1rem 0" }}>
      {labels.slice(0, total).map((label, i) => {
        const num = i + 1
        const active = num === step
        const done = num < step
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done || active ? "var(--primary)" : "var(--muted)",
                color: done || active ? "white" : "var(--foreground-muted)",
                fontWeight: 700, fontSize: "0.75rem",
                border: done || active ? "2px solid var(--primary)" : "2px solid var(--border)",
                transition: "all 0.2s",
              }}>
                {done ? "✓" : num}
              </div>
              <span style={{ fontSize: "0.5625rem", fontWeight: active ? 700 : 500, color: active ? "var(--primary)" : "var(--foreground-muted)", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < (total - 1) && (
              <div style={{ width: 32, height: 2, background: done ? "var(--primary)" : "var(--border)", margin: "0 4px", marginBottom: 16, transition: "background 0.2s" }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── F14: Caption dialog with per-file captions ──────────────────────────────
export interface UploadItem { file: File; caption: string }

// Inner caption form — reusable without the fixed backdrop
function CaptionDialogContent({
  files,
  onConfirm,
  onCancel,
  uploading,
}: {
  files: File[]
  onConfirm: (items: UploadItem[]) => void
  onCancel: () => void
  uploading: boolean
}) {
  const [captions, setCaptions] = useState<string[]>(() => files.map(() => ""))
  const [globalCaption, setGlobalCaption] = useState("")
  const [useGlobal, setUseGlobal] = useState(false)
  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  useEffect(() => {
    return () => { previewUrls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [previewUrls])

  function handleConfirm() {
    if (useGlobal) {
      onConfirm(files.map((file) => ({ file, caption: globalCaption.trim() })))
    } else {
      onConfirm(files.map((file, i) => ({ file, caption: captions[i].trim() })))
    }
  }

  const isMultiple = files.length > 1

  return (
    <div style={{ padding: "1.5rem" }}>
      <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.375rem" }}>
        <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
        {files.length === 1 ? "Subir foto" : `Subir ${files.length} fotos`}
      </h3>
      <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
        Agrega un pie de foto (opcional)
      </p>

      {/* F14: Multiple files with individual captions */}
      {isMultiple && (
        <div style={{ marginBottom: "0.875rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--foreground)", cursor: "pointer", marginBottom: "0.75rem" }}>
            <input
              type="checkbox"
              checked={useGlobal}
              onChange={(e) => setUseGlobal(e.target.checked)}
              style={{ accentColor: "var(--primary)" }}
            />
            Usar un pie de foto para todas
          </label>

          {useGlobal ? (
            <input
              className="input"
              type="text"
              placeholder="Pie de foto para todas..."
              value={globalCaption}
              onChange={(e) => setGlobalCaption(e.target.value)}
              maxLength={120}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm() }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {files.map((file, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrls[i]}
                    alt={`Foto ${i + 1}`}
                    style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "var(--radius-md)", flexShrink: 0 }}
                  />
                  <input
                    className="input"
                    type="text"
                    placeholder={`Pie de foto ${i + 1}...`}
                    value={captions[i]}
                    onChange={(e) => {
                      const next = [...captions]
                      next[i] = e.target.value
                      setCaptions(next)
                    }}
                    maxLength={120}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Single file */}
      {!isMultiple && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrls[0]}
            alt="Preview"
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }}
          />
          <input
            className="input"
            type="text"
            placeholder="Ej: Nuestra cena romántica..."
            value={captions[0]}
            onChange={(e) => {
              const next = [...captions]
              next[0] = e.target.value
              setCaptions(next)
            }}
            maxLength={120}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm() }}
            style={{ marginBottom: "1rem" }}
          />
        </>
      )}

      <div style={{ display: "flex", gap: "0.625rem", marginTop: isMultiple ? "1rem" : 0 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={uploading}>
          {uploading ? "Subiendo..." : "Subir"}
        </button>
        <button className="btn btn-outline" onClick={onCancel} disabled={uploading}>Cancelar</button>
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
  onConfirm: (items: UploadItem[]) => void
  onCancel: () => void
  uploading: boolean
}) {
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
          background: "white", borderRadius: "var(--radius-lg)",
          width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          maxHeight: "80vh", overflowY: "auto",
        }}
      >
        <CaptionDialogContent files={files} onConfirm={onConfirm} onCancel={onCancel} uploading={uploading} />
      </div>
    </div>
  )
}

// ── F15: Upload progress overlay ────────────────────────────────────────────
function UploadProgressOverlay({ current, total, fileName }: { current: number; total: number; fileName: string }) {
  return (
    <div style={{
      position: "fixed", bottom: "calc(80px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)",
      background: "var(--foreground)", color: "white", borderRadius: "var(--radius-lg)",
      padding: "0.75rem 1.25rem", zIndex: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      minWidth: "min(320px, 90vw)", animation: "modalIn 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
        <p style={{ fontSize: "0.875rem", fontWeight: 600, fontFamily: "'Fredoka', sans-serif" }}>
          Subiendo {current} de {total}...
        </p>
      </div>
      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fileName}
      </p>
      <div style={{ marginTop: "0.5rem", height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 999 }}>
        <div style={{
          height: "100%", borderRadius: 999,
          background: "linear-gradient(90deg, var(--primary), var(--secondary))",
          width: `${Math.round((current / total) * 100)}%`,
          transition: "width 0.3s ease",
        }} />
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

// ── F4: Find memory photos ──────────────────────────────────────────────────
function findMemoryPhotos(photos: Photo[]): { label: string; photos: Photo[] } | null {
  const now = new Date()
  const DAY = 86400000

  // Try 1 year ago (± 3 days)
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const yearPhotos = photos.filter((p) => {
    const diff = Math.abs(new Date(p.created_at).getTime() - oneYearAgo.getTime())
    return diff <= 3 * DAY
  })
  if (yearPhotos.length > 0) return { label: "hace un año", photos: yearPhotos.slice(0, 3) }

  // Try 6 months ago (± 3 days)
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixPhotos = photos.filter((p) => {
    const diff = Math.abs(new Date(p.created_at).getTime() - sixMonthsAgo.getTime())
    return diff <= 3 * DAY
  })
  if (sixPhotos.length > 0) return { label: "hace 6 meses", photos: sixPhotos.slice(0, 3) }

  return null
}

export default function FotosPage() {
  const qc = useQueryClient()
  const { data: photos, isLoading, error: photosError } = usePhotos()
  const uploadPhoto = useUploadPhoto()
  const deletePhoto = useDeletePhoto()
  const updateCaption = useUpdatePhotoCaption()
  const toggleReaction = useTogglePhotoReaction()
  const markViewed = useMarkPhotoViewed()

  // F3: albums
  const { data: albumsRaw = [] } = usePhotoAlbums()
  const albums = Array.isArray(albumsRaw) ? albumsRaw : []
  const createAlbum = useCreatePhotoAlbum()
  const deleteAlbum = useDeletePhotoAlbum()
  const updateAlbum = useUpdatePhotoAlbum()
  const [showAlbumForm, setShowAlbumForm] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null)

  const [filter, setFilter] = useState<FilterType>("all")
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fotosView") as ViewMode | null
      // Never restore "albums" view — it's a management overlay, not a browsing mode
      return (stored && stored !== "albums") ? stored : "feed"
    }
    return "feed"
  })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [commentsPhotoId, setCommentsPhotoId] = useState<string | null>(null)
  // F13: editing state for the image editor
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null)
  const [editedFiles, setEditedFiles] = useState<File[]>([])
  // Wizard state
  const [wizardStep, setWizardStep] = useState<"review" | "edit" | "details" | "uploading" | null>(null)
  const [reviewFiles, setReviewFiles] = useState<File[]>([])
  // F15: upload progress
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null)
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  // F2: search + month filter
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
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

  // Bulletproof: coerce to array even if the API/cache returns an unexpected
  // shape (e.g. paginated object during a deploy skew) so .some/.filter/.map
  // can never crash the whole page.
  const allPhotos = Array.isArray(photos) ? photos : []
  const has14Feb = allPhotos.some((p) => p.source === "14feb")
  const monthsCount = calcMonthsTogether(allPhotos)

  // F2: derive available months for month pills
  const monthGroups = useMemo(() => groupPhotosByMonth(allPhotos), [allPhotos])

  // Filter by source
  const sourceFilteredPhotos =
    filter === "all" ? allPhotos
    : filter === "thingstodo" ? allPhotos.filter((p) => p.source === "thingstodo")
    : allPhotos.filter((p) => p.source === "14feb")

  // F2: Filter by month
  const monthFilteredPhotos = selectedMonth
    ? sourceFilteredPhotos.filter((p) => {
        const key = new Date(p.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
        return key === selectedMonth
      })
    : sourceFilteredPhotos

  // F2: Filter by search query (client-side, caption text)
  const searchFilteredPhotos = searchQuery.trim()
    ? monthFilteredPhotos.filter((p) =>
        (p.caption ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : monthFilteredPhotos

  // F3: Filter by active album
  const filteredPhotos = activeAlbumId
    ? searchFilteredPhotos.filter((p) => (p as any).album_id === activeAlbumId)
    : searchFilteredPhotos

  // F1: progressive loading — show first 30 photos, "Ver más" loads 30 more
  const [visibleCount, setVisibleCount] = useState(30)
  // Reset visibleCount when filter changes
  useEffect(() => { setVisibleCount(30) }, [filter, selectedMonth, searchQuery])
  const visiblePhotos = filteredPhotos.slice(0, visibleCount)
  const hiddenCount = filteredPhotos.length - visibleCount

  // Stats
  const now = new Date()
  const thisMonth = allPhotos.filter((p) => {
    const d = new Date(p.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const lastPhoto = allPhotos.length > 0 ? allPhotos.reduce((a, b) => a.created_at > b.created_at ? a : b) : null
  const daysSinceLast = lastPhoto ? Math.floor((now.getTime() - new Date(lastPhoto.created_at).getTime()) / 86400000) : null
  const photoOfMonth = thisMonth.length > 0 ? thisMonth.reduce((a, b) => a.created_at > b.created_at ? a : b) : null

  const allPhotoIds = useMemo(() => allPhotos.map((p) => p.id), [allPhotos])
  const { data: reactionsRaw = [] } = usePhotoReactions(allPhotoIds)
  const reactions = Array.isArray(reactionsRaw) ? reactionsRaw : []
  const { data: commentsRaw = [] } = usePhotoComments(viewMode === "feed" || lightboxIndex !== null ? allPhotoIds : [])
  const comments = Array.isArray(commentsRaw) ? commentsRaw : []
  const addComment = useAddPhotoComment()
  const deleteComment = useDeletePhotoComment()

  // F9: photo views
  const { data: photoViews = {} } = usePhotoViews(viewMode === "feed" ? allPhotoIds : [])

  // Get current user UID from Firebase auth
  const [myUid, setMyUid] = useState("")
  useEffect(() => {
    import("@/lib/firebase/client").then(({ getFirebaseToken, getFirebaseAuth }) => {
      getFirebaseAuth().authStateReady().then(() => {
        setMyUid(getFirebaseAuth().currentUser?.uid ?? "")
      })
    })
  }, [])

  // F4: Memories banner
  const memory = useMemo(() => {
    if (monthsCount < 6) return null
    return findMemoryPhotos(allPhotos)
  }, [allPhotos, monthsCount])

  function toggleView() {
    const cycle: ViewMode[] = ["polaroid", "masonry", "feed", "albums"]
    const next = cycle[(cycle.indexOf(viewMode) + 1) % cycle.length]
    setViewMode(next)
    localStorage.setItem("fotosView", next)
  }

  // F13: After file selection, enter wizard
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setPendingFiles(files)
    setReviewFiles(files)
    setEditedFiles([])
    setEditingFileIndex(0)
    // For multiple files show review step; single file goes straight to edit
    setWizardStep(files.length > 1 ? "review" : "edit")
    e.target.value = ""
  }, [])

  // F13: Editor confirmed or skipped for a file
  function handleEditorResult(result: File | null) {
    if (!pendingFiles) return
    const fileToUse = result ?? pendingFiles[editingFileIndex!]
    const nextEdited = [...editedFiles, fileToUse]
    setEditedFiles(nextEdited)
    const nextIndex = editingFileIndex! + 1
    if (nextIndex < pendingFiles.length) {
      setEditingFileIndex(nextIndex)
    } else {
      // All files edited — move to details step
      setEditingFileIndex(null)
      setWizardStep("details")
    }
  }

  function cancelWizard() {
    setPendingFiles(null)
    setReviewFiles([])
    setEditedFiles([])
    setEditingFileIndex(null)
    setWizardStep(null)
  }

  // F14 + F15: Upload with per-file captions and progress indicator
  async function handleUploadConfirm(items: UploadItem[]) {
    setWizardStep("uploading")
    setUploadProgress({ current: 0, total: items.length, fileName: "" })
    let successCount = 0
    const freshIds: string[] = []
    const groupId = items.length > 1 ? crypto.randomUUID() : undefined
    for (let i = 0; i < items.length; i++) {
      const { file, caption } = items[i]
      setUploadProgress({ current: i + 1, total: items.length, fileName: file.name })
      try {
        const result = await uploadPhoto.mutateAsync({ file, caption: caption || undefined, group_id: groupId })
        successCount++
        if (result?.id) freshIds.push(result.id)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al subir foto")
      }
    }
    setUploadProgress(null)
    setWizardStep(null)
    if (successCount > 0) {
      // Invalidate once after all uploads so the carousel is never half-populated
      qc.invalidateQueries({ queryKey: ["photos"] })
      qc.invalidateQueries({ queryKey: ["photos-paginated"] })
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
    setReviewFiles([])
    setEditedFiles([])
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

  // F1: show visible slice in groups (filteredPhotos for lightbox navigation)
  const groupedPhotos = useMemo(() => groupPhotosByMonth(visiblePhotos), [visiblePhotos])

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

      {/* Stats strip */}
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

      {/* F4: Memories banner */}
      {memory && !isLoading && (
        <div style={{
          background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
          borderRadius: "var(--radius-xl)",
          padding: "1rem 1.125rem",
          marginBottom: "1rem",
          color: "white",
        }}>
          <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.625rem" }}>
            📅 Recuerdos de {memory.label}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto" }}>
            {memory.photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLightboxIndex(filteredPhotos.findIndex((fp) => fp.id === p.id))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumb_url ?? p.image_url}
                  alt={p.caption ?? `Recuerdo ${i + 1}`}
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills + view toggle */}
      {(allPhotos.length > 0 || isLoading) && (
        <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.625rem", alignItems: "center" }}>
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
            title={viewMode === "polaroid" ? "Vista cuadrícula" : viewMode === "masonry" ? "Vista feed" : viewMode === "feed" ? "Álbumes" : "Vista polaroid"}
            style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
              background: viewMode === "albums" ? "var(--primary-lighter)" : "var(--surface)",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: viewMode === "albums" ? "var(--primary)" : "var(--foreground-muted)", flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {viewMode === "polaroid" ? <LayoutGrid size={15} /> : viewMode === "masonry" ? <Newspaper size={15} /> : viewMode === "feed" ? <FolderOpen size={15} /> : <Rows3 size={15} />}
          </button>
        </div>
      )}

      {/* F2: Search input */}
      {allPhotos.length > 0 && !isLoading && (
        <div style={{ position: "relative", marginBottom: "0.625rem" }}>
          <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--foreground-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Buscar por pie de foto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "0.5rem 0.875rem 0.5rem 2rem",
              border: "1px solid var(--border)", borderRadius: "999px",
              background: "var(--muted)", fontFamily: "inherit", fontSize: "0.8125rem",
              color: "var(--foreground)", outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: "0.625rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: 2 }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* F2: Month filter pills */}
      {allPhotos.length > 0 && !isLoading && monthGroups.length > 1 && (
        <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", marginBottom: "0.875rem", paddingBottom: "2px" }}>
          <button
            onClick={() => setSelectedMonth(null)}
            style={{
              padding: "3px 12px", borderRadius: "999px", border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
              background: !selectedMonth ? "var(--primary)" : "var(--muted)",
              color: !selectedMonth ? "white" : "var(--foreground-muted)",
              whiteSpace: "nowrap", flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            Todos
          </button>
          {monthGroups.map(({ monthLabel }) => (
            <button
              key={monthLabel}
              onClick={() => setSelectedMonth(monthLabel === selectedMonth ? null : monthLabel)}
              style={{
                padding: "3px 12px", borderRadius: "999px", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                background: selectedMonth === monthLabel ? "var(--secondary)" : "var(--muted)",
                color: selectedMonth === monthLabel ? "white" : "var(--foreground-muted)",
                whiteSpace: "nowrap", flexShrink: 0,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {monthLabel}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem", padding: "0.5rem 0.25rem" }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error banner — shows the real reason photos failed to load */}
      {!isLoading && photosError && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "var(--radius-lg)",
          padding: "1rem", margin: "0.5rem 0", color: "#991B1B",
        }}>
          <p style={{ fontWeight: 700, margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
            No se pudieron cargar las fotos
          </p>
          <p style={{ margin: 0, fontSize: "0.8125rem", wordBreak: "break-word" }}>
            {photosError instanceof Error ? photosError.message : String(photosError)}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty state — D12 kawaii */}
      {!isLoading && allPhotos.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "3rem 1.5rem 2rem", gap: "1rem" }}>
          <svg width="140" height="110" viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="70" cy="60" r="46" fill="url(#emptyFotoGrad)" opacity="0.15" />
            <rect x="38" y="42" width="64" height="44" rx="8" fill="url(#emptyFotoGrad)" opacity="0.85"/>
            <circle cx="70" cy="64" r="14" fill="white" opacity="0.9"/>
            <circle cx="70" cy="64" r="9" fill="url(#emptyFotoGrad)" opacity="0.7"/>
            <circle cx="70" cy="64" r="4" fill="white" opacity="0.6"/>
            <rect x="56" y="36" width="20" height="10" rx="4" fill="url(#emptyFotoGrad)" opacity="0.7"/>
            <circle cx="88" cy="50" r="4" fill="#FDE68A" opacity="0.9"/>
            <circle cx="26" cy="36" r="10" fill="#EC4899" opacity="0.7"/>
            <rect x="18" y="48" width="16" height="20" rx="5" fill="#EC4899" opacity="0.5"/>
            <circle cx="114" cy="36" r="10" fill="#8B5CF6" opacity="0.7"/>
            <rect x="106" y="48" width="16" height="20" rx="5" fill="#8B5CF6" opacity="0.5"/>
            <text x="64" y="28" fontSize="14" textAnchor="middle" fill="#EC4899" opacity="0.8">♥</text>
            <defs>
              <linearGradient id="emptyFotoGrad" x1="38" y1="42" x2="102" y2="86" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8B5CF6"/>
                <stop offset="100%" stopColor="#EC4899"/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.375rem" }}>
              ¡Vuestra galería os espera!
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", lineHeight: 1.6, maxWidth: "240px" }}>
              Cada foto que subáis quedará guardada para siempre aquí. Empezad capturando vuestro primer momento juntos.
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ gap: "0.5rem", padding: "0.75rem 1.5rem", borderRadius: "999px", fontSize: "0.9375rem" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={18} />
            Subir primera foto
          </button>
        </div>
      )}

      {/* F3: Active album banner */}
      {activeAlbumId && viewMode !== "albums" && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: "var(--primary-lighter)", border: "1px solid var(--primary-light)",
          borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem", marginBottom: "0.75rem",
        }}>
          <Folder size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)", flex: 1 }}>
            {albums.find((a) => a.id === activeAlbumId)?.name ?? "Álbum"}
          </span>
          <button
            onClick={() => setActiveAlbumId(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filtered empty state */}
      {!isLoading && allPhotos.length > 0 && filteredPhotos.length === 0 && viewMode !== "albums" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "3rem 1.5rem", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Images size={32} color="var(--foreground-muted)" />
          </div>
          <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Sin resultados</p>
          <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem", margin: 0 }}>No hay fotos con ese filtro activo</p>
        </div>
      )}

      {/* F3: Albums view */}
      {viewMode === "albums" && !isLoading && (
        <div style={{ paddingBottom: "6rem" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <button
              onClick={() => { setViewMode("polaroid"); localStorage.setItem("fotosView", "polaroid") }}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                background: "var(--muted)", border: "none", borderRadius: "999px",
                padding: "0.375rem 0.875rem", fontFamily: "inherit",
                fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-muted)",
                cursor: "pointer",
              }}
            >
              ← Ver fotos
            </button>
            <button
              onClick={() => setShowAlbumForm((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                background: "var(--primary)", color: "white", border: "none",
                borderRadius: "999px", padding: "0.375rem 0.875rem",
                fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700,
                cursor: "pointer", transition: "opacity 0.15s",
              }}
            >
              <Plus size={14} /> Nuevo álbum
            </button>
          </div>

          {/* Create album form */}
          {showAlbumForm && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "1rem", marginBottom: "1rem",
              boxShadow: "0 2px 12px rgba(139,92,246,0.08)",
            }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.75rem", fontFamily: "'Fredoka', sans-serif", color: "var(--foreground)" }}>
                Nuevo álbum
              </p>
              <input
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Nombre del álbum..."
                style={{
                  width: "100%", padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--border)", fontFamily: "inherit", fontSize: "0.9375rem",
                  background: "var(--bg)", color: "var(--foreground)", marginBottom: "0.75rem",
                  outline: "none", boxSizing: "border-box",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newAlbumName.trim()) {
                    createAlbum.mutate({ name: newAlbumName.trim() }, {
                      onSuccess: () => { setNewAlbumName(""); setShowAlbumForm(false) },
                    })
                  }
                }}
              />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowAlbumForm(false); setNewAlbumName("") }}
                  style={{
                    background: "var(--muted)", border: "none", borderRadius: "var(--radius-md)",
                    padding: "0.5rem 1rem", fontFamily: "inherit", fontSize: "0.8125rem",
                    color: "var(--foreground-muted)", cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  disabled={!newAlbumName.trim() || createAlbum.isPending}
                  onClick={() => {
                    if (!newAlbumName.trim()) return
                    createAlbum.mutate({ name: newAlbumName.trim() }, {
                      onSuccess: () => { setNewAlbumName(""); setShowAlbumForm(false) },
                    })
                  }}
                  style={{
                    background: "var(--primary)", color: "white", border: "none",
                    borderRadius: "var(--radius-md)", padding: "0.5rem 1rem",
                    fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700,
                    cursor: "pointer", opacity: (!newAlbumName.trim() || createAlbum.isPending) ? 0.5 : 1,
                  }}
                >
                  Crear
                </button>
              </div>
            </div>
          )}

          {/* Albums grid */}
          {albums.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem", padding: "3rem 1.5rem", textAlign: "center" }}>
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary-lighter), #fce7f3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Folder size={40} color="var(--primary)" />
              </div>
              <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                ¡Crea tu primer álbum!
              </h3>
              <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem", margin: 0, maxWidth: 220, lineHeight: 1.5 }}>
                Organiza vuestros recuerdos en colecciones temáticas
              </p>
            </div>
          )}

          {albums.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.875rem" }}>
              {albums.map((album) => {
                const albumPhotos = allPhotos.filter((p) => (p as any).album_id === album.id)
                const coverUrl = album.cover_image ?? albumPhotos[0]?.thumb_url ?? albumPhotos[0]?.image_url ?? null
                const isActive = activeAlbumId === album.id
                return (
                  <div
                    key={album.id}
                    onClick={() => {
                      setActiveAlbumId(isActive ? null : album.id)
                      if (!isActive) setViewMode("polaroid")
                    }}
                    style={{
                      borderRadius: "var(--radius-lg)", overflow: "hidden",
                      background: "var(--surface)", border: `2px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                      cursor: "pointer", boxShadow: isActive ? "0 4px 20px rgba(139,92,246,0.2)" : "0 2px 8px rgba(0,0,0,0.06)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {/* Cover image */}
                    <div style={{ position: "relative", aspectRatio: "4/3", background: "var(--muted)", overflow: "hidden" }}>
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={album.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Folder size={32} style={{ color: "var(--foreground-muted)", opacity: 0.4 }} />
                        </div>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar álbum "${album.name}"?`)) {
                            deleteAlbum.mutate(album.id)
                            if (activeAlbumId === album.id) setActiveAlbumId(null)
                          }
                        }}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
                          width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "white",
                        }}
                      >
                        <X size={13} />
                      </button>
                      {/* Photo count badge */}
                      <div style={{
                        position: "absolute", bottom: 6, left: 6,
                        background: "rgba(0,0,0,0.55)", borderRadius: "999px",
                        padding: "2px 8px", fontSize: "0.6875rem", fontWeight: 700,
                        color: "white",
                      }}>
                        {albumPhotos.length} foto{albumPhotos.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {/* Album name */}
                    <div style={{ padding: "0.625rem 0.75rem" }}>
                      <p style={{
                        margin: 0, fontSize: "0.875rem", fontWeight: 700,
                        fontFamily: "'Fredoka', sans-serif", color: "var(--foreground)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {album.name}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Photo grid grouped by month */}
      {!isLoading && filteredPhotos.length > 0 && viewMode !== "albums" && (
        <div style={{ paddingBottom: "6rem" }}>
          {groupedPhotos.map((group) => (
            <div key={group.monthLabel}>
              {/* F2: hide month separator when a specific month is selected */}
              {!selectedMonth && (
                <div className="month-separator">
                  <Calendar size={14} />
                  {group.monthLabel}
                </div>
              )}
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
                  {groupPhotosIntoPosts(group.photos).map((post) => {
                    const primaryPhoto = post.photos[0]
                    return (
                      <FeedCard
                        key={post.id}
                        photo={primaryPhoto}
                        reactions={reactions}
                        commentCount={comments.filter((c) => c.photo_id === primaryPhoto.id).length}
                        myUid={myUid}
                        onReact={(emoji) => toggleReaction.mutate({ photoId: primaryPhoto.id, emoji })}
                        onOpenComments={() => setCommentsPhotoId(primaryPhoto.id)}
                        onClick={() => setLightboxIndex(filteredPhotos.findIndex((p) => p.id === primaryPhoto.id))}
                        partnerViewed={(photoViews as Record<string, PhotoViewData>)[primaryPhoto.id]?.partner_viewed}
                        groupPhotos={post.isGroup ? post.photos : undefined}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* F1: Load more button */}
      {!isLoading && hiddenCount > 0 && viewMode !== "albums" && (
        <div style={{ textAlign: "center", padding: "1rem 0 0.5rem" }}>
          <button
            onClick={() => setVisibleCount((v) => v + 30)}
            style={{
              background: "var(--primary-lighter)", border: "1px solid var(--primary-light)",
              borderRadius: "999px", padding: "0.625rem 1.75rem",
              fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 700,
              color: "var(--primary)", cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "white" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary-lighter)"; e.currentTarget.style.color = "var(--primary)" }}
          >
            Ver más ({hiddenCount} foto{hiddenCount !== 1 ? "s" : ""})
          </button>
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

      {/* Photo Upload Wizard */}
      {wizardStep && (pendingFiles || wizardStep === "uploading") && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 100,
          display: "flex", flexDirection: "column",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            position: "absolute", inset: "auto 0 0 0",
            background: "var(--background)", borderRadius: "1.25rem 1.25rem 0 0",
            maxHeight: "92vh", display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Step indicator */}
            <WizardHeader
              step={wizardStep === "review" ? 1 : wizardStep === "edit" ? 2 : wizardStep === "details" ? 3 : 4}
              total={4}
            />

            {/* Step 1: Review selection */}
            {wizardStep === "review" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)" }}>
                    {reviewFiles.length} foto{reviewFiles.length !== 1 ? "s" : ""} seleccionada{reviewFiles.length !== 1 ? "s" : ""}
                  </p>
                  <button onClick={cancelWizard} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "0.25rem", fontSize: "1rem" }}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                  {reviewFiles.map((file, i) => (
                    <ReviewThumb
                      key={`${file.name}-${file.size}-${i}`}
                      file={file}
                      onRemove={() => {
                        const next = reviewFiles.filter((_, j) => j !== i)
                        setReviewFiles(next)
                        if (next.length === 0) cancelWizard()
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelWizard}>Cancelar</button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    onClick={() => {
                      setPendingFiles(reviewFiles)
                      setEditedFiles([])
                      setEditingFileIndex(0)
                      setWizardStep("edit")
                    }}
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Edit — per-file image editor */}
            {wizardStep === "edit" && pendingFiles && editingFileIndex !== null && pendingFiles[editingFileIndex] && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem 0" }}>
                  <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>
                    Foto {editingFileIndex + 1} de {pendingFiles.length}
                  </p>
                  <button
                    onClick={() => {
                      // Skip all: collect remaining files unedited
                      const allUnedited = [...editedFiles, ...pendingFiles.slice(editingFileIndex)]
                      setEditedFiles(allUnedited)
                      setEditingFileIndex(null)
                      setWizardStep("details")
                    }}
                    style={{ background: "none", border: "none", fontSize: "0.8125rem", color: "var(--primary)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
                  >
                    Saltar todo
                  </button>
                </div>
                <ImageEditorContent
                  file={pendingFiles[editingFileIndex]}
                  onConfirm={(editedFile) => handleEditorResult(editedFile)}
                  onSkip={() => handleEditorResult(null)}
                  onCancel={cancelWizard}
                />
              </div>
            )}

            {/* Step 3: Details — caption dialog (inline, no separate backdrop) */}
            {wizardStep === "details" && editedFiles.length > 0 && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <CaptionDialogContent
                  files={editedFiles}
                  onConfirm={(items) => {
                    handleUploadConfirm(items)
                  }}
                  onCancel={cancelWizard}
                  uploading={uploadPhoto.isPending}
                />
              </div>
            )}

            {/* Step 4: Uploading — progress UI */}
            {wizardStep === "uploading" && uploadProgress && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", gap: "1rem" }}>
                <div style={{ fontSize: "2.5rem" }}>📤</div>
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)" }}>
                  Subiendo {uploadProgress.current} de {uploadProgress.total}
                </p>
                <div style={{ width: "100%", background: "var(--muted)", borderRadius: "999px", height: 8, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: "var(--primary)", borderRadius: "999px",
                    width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                  {uploadProgress.fileName}
                </p>
              </div>
            )}
          </div>
        </div>
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
            onAddComment={(content, parentCommentId) => addComment.mutateAsync({ photoId: photo.id, content, parentCommentId })}
            onDeleteComment={(id) => deleteComment.mutate(id)}
          />
        )
      })()}

      {/* Lightbox (F10 + F11) */}
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
          reactions={reactions}
          myUid={myUid}
          onReact={(photoId, emoji) => toggleReaction.mutate({ photoId, emoji })}
          onOpenComments={(photoId) => { setLightboxIndex(null); setCommentsPhotoId(photoId) }}
          comments={comments}
          onMarkViewed={(photoId) => markViewed.mutate(photoId)}
        />
      )}
    </div>
  )
}
