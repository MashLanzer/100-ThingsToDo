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

  const { content, mood, photos, is_private, is_pinned } = await req.json()

  const updates: Record<string, unknown> = {
    ...(content !== undefined ? { content: content?.trim() } : {}),
    ...(mood !== undefined ? { mood } : {}),
    ...(photos !== undefined ? { photos: photos ?? [] } : {}),
    ...(is_private !== undefined ? { is_private: is_private === true } : {}),
    ...(is_pinned !== undefined ? { is_pinned: is_pinned === true } : {}),
  }

  let { data, error } = await supabase
    .from("journal_entries")
    .update(updates)
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  // If is_pinned caused a column-not-found error, retry without it
  if (error && error.message?.includes("is_pinned") && is_pinned !== undefined) {
    const safeUpdates = { ...updates }
    delete safeUpdates["is_pinned"]
    const retry = await supabase
      .from("journal_entries")
      .update(safeUpdates)
      .eq("id", id)
      .eq("couple_id", me.couple_id)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { content, mood, photos } = await req.json()

  const { data, error } = await supabase
    .from("journal_entries")
    .update({ content: content?.trim(), mood, photos: photos ?? [] })
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/journal/[id] — only the author can delete their own entry
export async function DELETE(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .eq("created_by", user.uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
