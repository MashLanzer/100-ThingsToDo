import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

// Helper: verify task belongs to user's couple
async function verifyTaskAccess(taskId: string, userId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", userId).single()
  if (!me?.couple_id) return null

  const { data: task } = await supabase.from("tasks").select("id, plan_id").eq("id", taskId).single()
  if (!task) return null

  const { data: plan } = await supabase.from("plans").select("id").eq("id", task.plan_id).eq("couple_id", me.couple_id).single()
  if (!plan) return null

  return supabase
}

// GET /api/tasks/[id]/subtasks
export async function GET(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: taskId } = await params
  const supabase = await verifyTaskAccess(taskId, user.uid)
  if (!supabase) return NextResponse.json([])

  const { data, error } = await supabase
    .from("task_subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true })

  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

// POST /api/tasks/[id]/subtasks
export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: taskId } = await params
  const supabase = await verifyTaskAccess(taskId, user.uid)
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { title, sort_order = 0 } = body

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  const { data, error } = await supabase
    .from("task_subtasks")
    .insert({ task_id: taskId, title: title.trim(), sort_order })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/tasks/[id]/subtasks?subtaskId=uuid
export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: taskId } = await params
  const subtaskId = req.nextUrl.searchParams.get("subtaskId")
  if (!subtaskId) return NextResponse.json({ error: "subtaskId required" }, { status: 400 })

  const supabase = await verifyTaskAccess(taskId, user.uid)
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ("title" in body) updates.title = body.title
  if ("completed" in body) updates.completed = body.completed
  if ("sort_order" in body) updates.sort_order = body.sort_order

  const { data, error } = await supabase
    .from("task_subtasks")
    .update(updates)
    .eq("id", subtaskId)
    .eq("task_id", taskId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/tasks/[id]/subtasks?subtaskId=uuid
export async function DELETE(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: taskId } = await params
  const subtaskId = req.nextUrl.searchParams.get("subtaskId")
  if (!subtaskId) return NextResponse.json({ error: "subtaskId required" }, { status: 400 })

  const supabase = await verifyTaskAccess(taskId, user.uid)
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await supabase.from("task_subtasks").delete().eq("id", subtaskId).eq("task_id", taskId)
  return NextResponse.json({ ok: true })
}
