import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

// PATCH /api/tasks/[id] — toggle completion or update task
export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const body = await req.json()

  // Verify task exists and belongs to user's couple
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data: task } = await supabase
    .from("tasks")
    .select("id, completed, plan_id, title")
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Verify plan belongs to couple
  const { data: plan } = await supabase.from("plans").select("id").eq("id", task.plan_id).eq("couple_id", me.couple_id).single()
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const updates: Record<string, unknown> = {}

  if ("completed" in body) {
    updates.completed = body.completed
    updates.completed_by = body.completed ? user.uid : null
    updates.completed_at = body.completed ? new Date().toISOString() : null
  }

  if ("title" in body) updates.title = body.title
  if ("icon" in body) updates.icon = body.icon

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send push when task completed
  if (body.completed) {
    await fetch(`${req.nextUrl.origin}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
      body: JSON.stringify({ title: "¡Tarea completada! ✅", body: task.title }),
    }).catch(() => {})
  }

  return NextResponse.json(data)
}

// DELETE /api/tasks/[id]
export async function DELETE(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data: task } = await supabase.from("tasks").select("id, plan_id").eq("id", id).single()
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: plan } = await supabase.from("plans").select("id").eq("id", task.plan_id).eq("couple_id", me.couple_id).single()
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await supabase.from("tasks").delete().eq("id", id)
  return NextResponse.json({ ok: true })
}
