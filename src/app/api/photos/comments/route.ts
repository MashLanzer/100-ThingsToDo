import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/photos/comments?photo_ids=id1,id2,...
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const ids = req.nextUrl.searchParams.get("photo_ids")?.split(",").filter(Boolean) ?? []
  if (ids.length === 0) return NextResponse.json([])

  const { data, error } = await supabase
    .from("photo_comments")
    .select("id, photo_id, user_id, content, parent_comment_id, created_at")
    .in("photo_id", ids)
    .order("created_at", { ascending: true })

  // If the table doesn't exist yet (migration not applied), don't break the feed.
  if (error) return NextResponse.json([])

  const rows = data ?? []
  // Attach commenter names
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const names = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, name").in("id", userIds)
    for (const u of users ?? []) names.set(u.id, u.name ?? "")
  }

  const enriched = rows.map((r) => ({ ...r, user_name: names.get(r.user_id) ?? "" }))

  // Build nested structure: top-level comments with replies array
  const topLevel = enriched.filter((r) => !r.parent_comment_id)
  const replies = enriched.filter((r) => r.parent_comment_id)
  const nested = topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parent_comment_id === c.id),
  }))

  return NextResponse.json(nested)
}

// POST /api/photos/comments — add a comment
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { photo_id, content, parent_comment_id } = body as {
    photo_id?: string
    content?: string
    parent_comment_id?: string | null
  }
  if (!photo_id || !content?.trim()) {
    return NextResponse.json({ error: "photo_id and content required" }, { status: 400 })
  }

  const insertRow: Record<string, unknown> = {
    photo_id,
    user_id: user.uid,
    content: content.trim().slice(0, 500),
  }
  if (parent_comment_id) insertRow.parent_comment_id = parent_comment_id

  const { data, error } = await supabase
    .from("photo_comments")
    .insert(insertRow)
    .select("id, photo_id, user_id, content, parent_comment_id, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: me } = await supabase.from("users").select("name").eq("id", user.uid).single()
  return NextResponse.json({ ...data, user_name: me?.name ?? "" })
}

// DELETE /api/photos/comments?id=...
export async function DELETE(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Only allow deleting your own comment
  const { error } = await supabase.from("photo_comments").delete().eq("id", id).eq("user_id", user.uid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
