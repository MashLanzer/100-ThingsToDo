import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([], { status: 200 })

  const { data, error } = await supabase
    .from("couple_book_entries")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("couple_id, name")
    .eq("id", user.uid)
    .single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const body = await req.json()
  const { content } = body

  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })
  if (content.trim().length > 300) return NextResponse.json({ error: "max 300 chars" }, { status: 400 })

  // Enforce alternating turns — last entry must not be from this user
  const { data: last } = await supabase
    .from("couple_book_entries")
    .select("author_id")
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (last?.author_id === user.uid) {
    return NextResponse.json({ error: "not_your_turn" }, { status: 409 })
  }

  const { data, error } = await supabase
    .from("couple_book_entries")
    .insert({
      couple_id: me.couple_id,
      author_id: user.uid,
      author_name: me.name ?? "Tú",
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
