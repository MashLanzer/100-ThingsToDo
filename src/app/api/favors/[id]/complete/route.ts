import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  let completion_note: string | null = null
  try {
    const body = await req.json()
    completion_note = body?.completion_note?.trim() || null
  } catch { /* body may be empty */ }

  const updateData: Record<string, unknown> = {
    is_completed: true,
    completed_by: user.uid,
    completed_at: new Date().toISOString(),
  }
  if (completion_note) updateData.completion_note = completion_note

  // Try update with completion_note; fall back without it if column doesn't exist yet
  let result = await supabase
    .from("favors")
    .update(updateData)
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  if (result.error && result.error.message?.includes("completion_note") && completion_note) {
    const fallback: Record<string, unknown> = { ...updateData }
    delete fallback.completion_note
    result = await supabase
      .from("favors")
      .update(fallback)
      .eq("id", id)
      .eq("couple_id", me.couple_id)
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })

  // Send push to partner
  await fetch(`${req.nextUrl.origin}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
    body: JSON.stringify({ title: "¡Favor completado! 💝", body: result.data?.title }),
  }).catch(() => {})

  return NextResponse.json(result.data)
}
