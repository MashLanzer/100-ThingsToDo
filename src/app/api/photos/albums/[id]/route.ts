import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const { data, error } = await supabase
    .from("photo_albums")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if ("name" in body) updates.name = body.name
  if ("description" in body) updates.description = body.description
  if ("cover_image" in body) updates.cover_image = body.cover_image

  // Update photo's album_id if photoIds provided
  if (body.addPhotoIds?.length > 0) {
    await supabase.from("photos").update({ album_id: id }).in("id", body.addPhotoIds)
  }
  if (body.removePhotoIds?.length > 0) {
    await supabase.from("photos").update({ album_id: null }).in("id", body.removePhotoIds)
  }

  if (Object.keys(updates).length === 0 && !body.addPhotoIds && !body.removePhotoIds) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from("photo_albums")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await params

  // Remove album from photos first
  await supabase.from("photos").update({ album_id: null }).eq("album_id", id)

  const { error } = await supabase.from("photo_albums").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
