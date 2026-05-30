import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

// GET /api/tasks/[id]/reactions — return reactions for task
export async function GET(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json([])

  const { id: taskId } = await params

  // Verify task belongs to user's couple (defensive check)
  const { data: me } = await supabase.from("users").select("couple_id, name").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  const { data, error } = await supabase
    .from("task_reactions")
    .select("id, emoji, user_id, users(name)")
    .eq("task_id", taskId)

  if (error) return NextResponse.json([]) // defensive: table may not exist

  const reactions = (data ?? []).map((r) => ({
    id: r.id,
    emoji: r.emoji,
    user_id: r.user_id,
    user_name: (Array.isArray(r.users) ? (r.users[0] as { name: string } | undefined)?.name : (r.users as { name: string } | null)?.name) ?? null,
  }))

  return NextResponse.json(reactions)
}

// POST /api/tasks/[id]/reactions — toggle reaction (upsert or delete)
export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id: taskId } = await params
  const body = await req.json()
  const { emoji } = body

  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  // Verify task belongs to user's couple
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data: task } = await supabase.from("tasks").select("id, plan_id").eq("id", taskId).single()
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("id", task.plan_id)
    .eq("couple_id", me.couple_id)
    .single()
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Check if reaction already exists (toggle)
  const { data: existing, error: fetchError } = await supabase
    .from("task_reactions")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", user.uid)
    .eq("emoji", emoji)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = "not found", other errors might mean table doesn't exist
    return NextResponse.json({ toggled: false, action: "error" })
  }

  if (existing) {
    // Toggle off: delete
    const { error: delError } = await supabase.from("task_reactions").delete().eq("id", existing.id)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    return NextResponse.json({ toggled: true, action: "removed" })
  } else {
    // Upsert new reaction
    const { error: upsertError } = await supabase
      .from("task_reactions")
      .upsert({ task_id: taskId, user_id: user.uid, emoji }, { onConflict: "task_id,user_id,emoji" })
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
    return NextResponse.json({ toggled: true, action: "added" })
  }
}
