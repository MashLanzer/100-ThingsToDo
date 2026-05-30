"use client"

import { useRef, useEffect, useState, ReactNode } from "react"

const THRESHOLD = 65

interface Props {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PullToRefresh({ onRefresh, children, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)
  const curDy = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  const [pullH, setPullH] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [snapping, setSnapping] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onStart(e: TouchEvent) {
      if (refreshingRef.current || el!.scrollTop > 2) return
      startY.current = e.touches[0].clientY
      pullingRef.current = true
      curDy.current = 0
    }

    function onMove(e: TouchEvent) {
      if (!pullingRef.current || refreshingRef.current) return
      if (el!.scrollTop > 2) { cancel(); return }
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { cancel(); return }
      e.preventDefault()
      curDy.current = dy
      setPullH(Math.min(dy * 0.5, THRESHOLD + 8))
    }

    async function onEnd() {
      if (!pullingRef.current) return
      pullingRef.current = false
      setSnapping(true)
      if (curDy.current * 0.5 >= THRESHOLD * 0.85) {
        refreshingRef.current = true
        setSpinning(true)
        setPullH(THRESHOLD * 0.75)
        try { await onRefreshRef.current() } catch { /* */ }
        refreshingRef.current = false
        setSpinning(false)
      }
      curDy.current = 0
      setPullH(0)
      setTimeout(() => setSnapping(false), 280)
    }

    function cancel() {
      pullingRef.current = false
      curDy.current = 0
      setSnapping(true)
      setPullH(0)
      setTimeout(() => setSnapping(false), 280)
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    el.addEventListener("touchcancel", cancel, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
      el.removeEventListener("touchcancel", cancel)
    }
  }, [])

  return (
    <div ref={ref} className={className ?? "app-content-body"} style={style}>
      {/* PTR indicator slot */}
      <div style={{
        height: `${pullH}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        transition: snapping ? "height 0.25s ease" : "none",
      }}>
        {pullH > 14 && (
          <div style={{
            width: "30px", height: "30px", borderRadius: "50%",
            background: "var(--primary-lighter)",
            border: "2px solid var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9rem", color: "var(--primary)",
            animation: spinning ? "ptr-spin 0.7s linear infinite" : "none",
            transition: "transform 0.2s",
            transform: !spinning && pullH >= THRESHOLD * 0.85 ? "rotate(180deg)" : "none",
          }}>
            {spinning ? "↻" : "↓"}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
