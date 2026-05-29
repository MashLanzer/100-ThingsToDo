import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { generateCoupleCode } from "@/lib/utils"

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  // Check if user already exists
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.uid)
    .single()

  if (existing) {
    // Update name/avatar if changed
    await supabase
      .from("users")
      .update({ name: user.name ?? existing.name, avatar_url: user.picture ?? existing.avatar_url, email: user.email ?? existing.email })
      .eq("id", user.uid)
    return NextResponse.json({ ...existing, name: user.name ?? existing.name })
  }

  // Create new user with unique couple code
  let code = generateCoupleCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: conflict } = await supabase.from("users").select("id").eq("couple_code", code).single()
    if (!conflict) break
    code = generateCoupleCode()
    attempts++
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      id: user.uid,
      name: user.name ?? "Usuario",
      email: user.email,
      avatar_url: user.picture,
      couple_code: code,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(created, { status: 201 })
}
