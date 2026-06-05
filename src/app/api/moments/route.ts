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
    .from("couple_moments")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("moment_date", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const body = await req.json()
  const { title, emoji, moment_date, description, photo_url, thumb_url } = body

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })
  if (!moment_date) return NextResponse.json({ error: "moment_date required" }, { status: 400 })

  const { data, error } = await supabase
    .from("couple_moments")
    .insert({
      couple_id: me.couple_id,
      title: title.trim(),
      emoji: emoji ?? "💫",
      moment_date,
      description: description?.trim() ?? null,
      photo_url: photo_url ?? null,
      thumb_url: thumb_url ?? null,
      added_by: user.uid,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
