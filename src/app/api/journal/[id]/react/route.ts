import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

// POST /api/journal/[id]/react  { emoji: "❤️" | null }
// Toggles the current user's reaction on a partner's entry.
export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { emoji } = await req.json()

  const { data: entry, error: getErr } = await supabase
    .from("journal_entries")
    .select("id, reactions")
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .single()
  if (getErr || !entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 })

  const reactions: Record<string, string> = (entry.reactions as Record<string, string>) ?? {}
  if (!emoji || reactions[user.uid] === emoji) {
    delete reactions[user.uid]
  } else {
    reactions[user.uid] = emoji
  }

  const { error } = await supabase
    .from("journal_entries")
    .update({ reactions })
    .eq("id", id)
    .eq("couple_id", me.couple_id)

  // Reactions column (migration 024) may not be applied yet — fail soft.
  if (error && /column .* does not exist|reactions/i.test(error.message)) {
    return NextResponse.json({ ok: false, reactions: {} })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reactions })
}
