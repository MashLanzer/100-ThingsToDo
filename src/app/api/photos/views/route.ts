import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// POST /api/photos/views — mark a photo as viewed
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { photo_id } = body as { photo_id?: string }
  if (!photo_id) return NextResponse.json({ error: "photo_id required" }, { status: 400 })

  const { error } = await supabase.from("photo_views").upsert(
    { photo_id, user_id: user.uid, viewed_at: new Date().toISOString() },
    { onConflict: "photo_id,user_id" }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// GET /api/photos/views?photo_ids=id1,id2,...
// Returns { [photo_id]: { count: number, partner_viewed: boolean } }
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const ids = req.nextUrl.searchParams.get("photo_ids")?.split(",").filter(Boolean) ?? []
  if (ids.length === 0) return NextResponse.json({})

  const { data, error } = await supabase
    .from("photo_views")
    .select("photo_id, user_id")
    .in("photo_id", ids)

  if (error) return NextResponse.json({})

  const rows = data ?? []
  const result: Record<string, { count: number; partner_viewed: boolean }> = {}
  for (const id of ids) {
    const photoRows = rows.filter((r) => r.photo_id === id)
    result[id] = {
      count: photoRows.length,
      partner_viewed: photoRows.some((r) => r.user_id !== user.uid),
    }
  }
  return NextResponse.json(result)
}
