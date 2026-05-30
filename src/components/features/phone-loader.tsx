export function PhoneLoader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "0.5rem" }}>
      <svg className="animate-heartbeat" width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 500 }}>{text}</span>
    </div>
  )
}
