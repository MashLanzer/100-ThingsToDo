import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/photos/reactions?photo_ids=id1,id2,...
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const ids = req.nextUrl.searchParams.get("photo_ids")?.split(",").filter(Boolean) ?? []
  if (ids.length === 0) return NextResponse.json([])

  const { data, error } = await supabase
    .from("photo_reactions")
    .select("photo_id, user_id, emoji")
    .in("photo_id", ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/photos/reactions — toggle a reaction
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { photo_id, emoji } = body as { photo_id?: string; emoji?: string }
  if (!photo_id || !emoji) return NextResponse.json({ error: "photo_id and emoji required" }, { status: 400 })

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("photo_reactions")
    .select("id")
    .eq("photo_id", photo_id)
    .eq("user_id", user.uid)
    .eq("emoji", emoji)
    .single()

  if (existing) {
    // Toggle off — delete
    await supabase.from("photo_reactions").delete().eq("id", existing.id)
    return NextResponse.json({ action: "removed" })
  }

  // Toggle on — insert
  const { error } = await supabase.from("photo_reactions").insert({
    photo_id,
    user_id: user.uid,
    emoji,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: "added" })
}
