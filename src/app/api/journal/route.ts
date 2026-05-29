import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/journal?year=2025&month=5
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")
  const month = searchParams.get("month")

  let query = supabase
    .from("journal_entries")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("date", { ascending: false })

  if (year && month) {
    const pad = month.padStart(2, "0")
    query = query.gte("date", `${year}-${pad}-01`).lte("date", `${year}-${pad}-31`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/journal
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { date, content, mood } = await req.json()
  if (!date || !content?.trim()) {
    return NextResponse.json({ error: "date and content required" }, { status: 400 })
  }

  // Upsert by couple_id + date
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(
      { couple_id: me.couple_id, date, content: content.trim(), mood: mood ?? "happy", created_by: user.uid },
      { onConflict: "couple_id,date" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
