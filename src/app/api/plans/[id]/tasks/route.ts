import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

// GET /api/plans/[id]/tasks
export async function GET(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id: planId } = await params

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  // Verify plan belongs to this couple
  const { data: plan } = await supabase.from("plans").select("id").eq("id", planId).eq("couple_id", me.couple_id).single()
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const completedByUids = [...new Set((data ?? []).filter(t => t.completed_by).map(t => t.completed_by as string))]
  let enriched: typeof data = data
  if (completedByUids.length > 0) {
    const { data: users } = await supabase.from("users").select("id, name").in("id", completedByUids)
    const nameMap = new Map((users ?? []).map(u => [u.id, u.name]))
    enriched = (data ?? []).map(t => ({ ...t, completed_by_name: t.completed_by ? (nameMap.get(t.completed_by) ?? null) : null }))
  } else {
    enriched = (data ?? []).map(t => ({ ...t, completed_by_name: null }))
  }
  return NextResponse.json(enriched)
}

// POST /api/plans/[id]/tasks
export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id: planId } = await params

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data: plan } = await supabase.from("plans").select("id").eq("id", planId).eq("couple_id", me.couple_id).single()
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { title, icon, sort_order, notes, due_date } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("tasks")
    .insert({ plan_id: planId, title: title.trim(), icon: icon ?? "✨", sort_order: sort_order ?? 0, created_by: user.uid, notes: notes ?? null, due_date: due_date ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Touch plan updated_at
  await supabase.from("plans").update({ updated_at: new Date().toISOString() }).eq("id", planId)

  // Send push to partner
  await fetch(`${req.nextUrl.origin}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
    body: JSON.stringify({ title: "Nueva tarea 📝", body: title.trim() }),
  }).catch(() => {})

  return NextResponse.json(data, { status: 201 })
}
