import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  const { data, error } = await supabase
    .from("favors")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { title, description, difficulty, category, points, assigned_to } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  const insertData: Record<string, unknown> = {
    couple_id: me.couple_id,
    title: title.trim(),
    description: description?.trim() ?? null,
    difficulty: difficulty ?? "medium",
    category: category ?? "romantic",
    points: points ?? 25,
    created_by: user.uid,
  }
  if (assigned_to) insertData.assigned_to = assigned_to

  // Try insert with assigned_to; fall back without it if column doesn't exist
  let result = await supabase.from("favors").insert(insertData).select().single()

  if (result.error && result.error.message?.includes("assigned_to") && assigned_to) {
    const fallback: Record<string, unknown> = { ...insertData }
    delete fallback.assigned_to
    result = await supabase.from("favors").insert(fallback).select().single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data, { status: 201 })
}
