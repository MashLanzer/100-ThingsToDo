"use client"

import { useEffect, useRef, useState } from "react"

const THRESHOLD = 80

export function useWindowPTR(onRefresh: () => Promise<void> | void) {
  const [visible, setVisible] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  useEffect(() => {
    let startY = 0
    let pulling = false
    let refreshing = false
    let currentDy = 0

    function onStart(e: TouchEvent) {
      if (refreshing || window.scrollY > 4) return
      startY = e.touches[0].clientY
      pulling = true
      currentDy = 0
    }

    function onMove(e: TouchEvent) {
      if (!pulling || refreshing) return
      if (window.scrollY > 4) { pulling = false; setVisible(false); return }
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) { pulling = false; setVisible(false); return }
      e.preventDefault()
      currentDy = dy
      setVisible(dy > 20)
    }

    async function onEnd() {
      if (!pulling) return
      pulling = false
      if (currentDy >= THRESHOLD) {
        refreshing = true
        setSpinning(true)
        setVisible(true)
        try { await onRefreshRef.current() } catch { /* */ }
        refreshing = false
        setSpinning(false)
        setVisible(false)
      } else {
        setVisible(false)
      }
      currentDy = 0
    }

    document.addEventListener("touchstart", onStart, { passive: true })
    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onStart)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onEnd)
    }
  }, [])

  return { visible, spinning }
}
