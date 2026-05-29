import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/plans
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.uid)
    .single()

  if (!me?.couple_id) return NextResponse.json([])

  const { data, error } = await supabase
    .from("plans")
    .select(`
      id, title, description, created_by, created_at, updated_at,
      tasks ( id, completed )
    `)
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/plans
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

  if (!me?.couple_id) return NextResponse.json({ error: "Necesitas una pareja para crear planes" }, { status: 400 })

  const { title, description } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

  const { data, error } = await supabase
    .from("plans")
    .insert({ title: title.trim(), description: description?.trim() ?? null, couple_id: me.couple_id, created_by: user.uid })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
