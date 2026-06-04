import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/letters — list letters for current user's couple
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  const now = new Date().toISOString()

  // Try with send_at filter: scheduled letters (send_at > now) only visible to sender
  let { data, error } = await supabase
    .from("letters")
    .select("*")
    .eq("couple_id", me.couple_id)
    .or(`from_user_id.eq.${user.uid},send_at.is.null,send_at.lte.${now}`)
    .order("created_at", { ascending: false })

  // If send_at column doesn't exist yet, retry without that filter
  if (error && (error.message.includes("send_at") || error.code === "42703")) {
    const fallback = await supabase
      .from("letters")
      .select("*")
      .eq("couple_id", me.couple_id)
      .order("created_at", { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/letters — create a new letter to partner
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.uid)
    .single()

  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", me.couple_id)
    .single()

  if (!couple) return NextResponse.json({ error: "Couple not found" }, { status: 404 })

  const partnerId = couple.user1_id === user.uid ? couple.user2_id : couple.user1_id

  const { subject, content, send_at, photo_url } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  const insertData: Record<string, unknown> = {
    couple_id: me.couple_id,
    from_user_id: user.uid,
    to_user_id: partnerId,
    subject: subject?.trim() || null,
    content: content.trim(),
    ...(send_at ? { send_at } : {}),
    ...(photo_url ? { photo_url } : {}),
  }

  let { data, error } = await supabase
    .from("letters")
    .insert(insertData)
    .select()
    .single()

  // If photo_url or send_at columns don't exist yet, retry without them
  if (error && (error.message.includes("photo_url") || error.message.includes("send_at") || error.code === "42703")) {
    const { photo_url: _p, send_at: _s, ...safeData } = insertData as Record<string, unknown> & { photo_url?: unknown; send_at?: unknown }
    void _p; void _s
    const retry = await supabase.from("letters").insert(safeData).select().single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
