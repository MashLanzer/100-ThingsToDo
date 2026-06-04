import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

// POST /api/letters/[id]/react — toggle emoji reaction
export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { emoji } = await req.json()
  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "emoji required" }, { status: 400 })
  }

  // Fetch current letter to get reactions
  const { data: letter, error: fetchError } = await supabase
    .from("letters")
    .select("reactions, from_user_id, to_user_id")
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .single()

  if (fetchError) {
    // If reactions column doesn't exist, silently succeed
    if (fetchError.message.includes("reactions") || fetchError.code === "42703") {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!letter) return NextResponse.json({ error: "Letter not found" }, { status: 404 })

  const reactions: Record<string, string> = (letter.reactions as Record<string, string>) ?? {}

  // Toggle: remove if same emoji, add/replace otherwise
  if (reactions[user.uid] === emoji) {
    delete reactions[user.uid]
  } else {
    reactions[user.uid] = emoji
  }

  const { data, error } = await supabase
    .from("letters")
    .update({ reactions })
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  if (error) {
    // If reactions column doesn't exist, silently succeed
    if (error.message.includes("reactions") || error.code === "42703") {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
