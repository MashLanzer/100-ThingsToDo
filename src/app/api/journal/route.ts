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
    const y = parseInt(year, 10)
    const m = parseInt(month, 10)
    if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
      const pad = month.padStart(2, "0")
      // Use the first day of the next month with `lt` so we never build an
      // invalid date like 2026-06-31 (which makes Postgres reject the whole
      // query and the journal appears empty for 30-day months and February).
      const nextM = m === 12 ? 1 : m + 1
      const nextY = m === 12 ? y + 1 : y
      const start = `${year}-${pad}-01`
      const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`
      query = query.gte("date", start).lt("date", end)
    }
  }

  let { data, error } = await query
    .or(`created_by.eq.${user.uid},is_private.eq.false`)

  // If is_private column doesn't exist yet (migration pending), retry without the filter
  if (error && /is_private|column.*does not exist/i.test(error.message)) {
    ;({ data, error } = await query)
  }

  if (error) {
    console.error("[journal GET]", error.message)
    return NextResponse.json([])
  }
  return NextResponse.json(data ?? [])
}

// POST /api/journal
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { date, content, mood, photos, audio_url, tags, location, is_private } = await req.json()
  if (!date || !content?.trim()) {
    return NextResponse.json({ error: "date and content required" }, { status: 400 })
  }

  const baseRow = {
    couple_id: me.couple_id, date, content: content.trim(), mood: mood ?? "happy",
    created_by: user.uid, photos: photos ?? [], audio_url: audio_url ?? null,
    is_private: is_private === true,
  }
  const fullRow = {
    ...baseRow,
    tags: Array.isArray(tags) ? tags : [],
    location: typeof location === "string" && location.trim() ? location.trim() : null,
  }

  // Try upsert with 3-column conflict (migration 016 constraint)
  let { data, error } = await supabase
    .from("journal_entries")
    .upsert(fullRow, { onConflict: "couple_id,date,created_by" })
    .select()
    .single()

  // If tags/location columns missing, retry without them
  if (error && /column .* does not exist|tags|location/i.test(error.message)) {
    ;({ data, error } = await supabase
      .from("journal_entries")
      .upsert(baseRow, { onConflict: "couple_id,date,created_by" })
      .select()
      .single())
  }

  // If conflict target doesn't match any constraint, fall back to manual upsert
  if (error && /there is no unique or exclusion constraint|42P10|onConflict/i.test(error.message)) {
    // Check if entry exists for this user on this date
    const { data: existing } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("couple_id", me.couple_id)
      .eq("date", date)
      .eq("created_by", user.uid)
      .single()

    if (existing?.id) {
      ;({ data, error } = await supabase
        .from("journal_entries")
        .update(fullRow)
        .eq("id", existing.id)
        .select()
        .single())
      // retry without tags/location if needed
      if (error && /column .* does not exist|tags|location/i.test(error.message)) {
        ;({ data, error } = await supabase
          .from("journal_entries")
          .update(baseRow)
          .eq("id", existing.id)
          .select()
          .single())
      }
    } else {
      ;({ data, error } = await supabase
        .from("journal_entries")
        .insert(fullRow)
        .select()
        .single())
      if (error && /column .* does not exist|tags|location/i.test(error.message)) {
        ;({ data, error } = await supabase
          .from("journal_entries")
          .insert(baseRow)
          .select()
          .single())
      }
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
