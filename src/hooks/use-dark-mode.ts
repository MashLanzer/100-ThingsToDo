"use client"
import { useEffect, useState } from "react"

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    setIsDark(el.getAttribute("data-dark") === "true")
    const observer = new MutationObserver(() =>
      setIsDark(el.getAttribute("data-dark") === "true")
    )
    observer.observe(el, { attributes: true, attributeFilter: ["data-dark"] })
    return () => observer.disconnect()
  }, [])
  return isDark
}
