import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

const IMGBB_API_KEY = process.env.IMGBB_API_KEY!

// POST /api/couple/photo — upload couple photo and save URL
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

  if (!me?.couple_id) {
    return NextResponse.json({ error: "Debes tener pareja vinculada para subir una foto conjunta" }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Field 'file' is required" }, { status: 400 })
  }

  if (!IMGBB_API_KEY) {
    return NextResponse.json({ error: "ImgBB not configured" }, { status: 503 })
  }

  const imgbbForm = new FormData()
  imgbbForm.append("image", file)
  const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: imgbbForm,
  })
  if (!imgbbRes.ok) return NextResponse.json({ error: "ImgBB upload failed" }, { status: 502 })

  const imgbbData = await imgbbRes.json()
  if (!imgbbData?.data?.url) {
    return NextResponse.json({ error: "ImgBB response invalid" }, { status: 502 })
  }

  const photoUrl: string = imgbbData.data.url

  const { data: couple, error } = await supabase
    .from("couples")
    .update({ photo_url: photoUrl })
    .eq("id", me.couple_id)
    .select("id, user1_id, user2_id, created_at, anniversary_date, photo_url")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ couple })
}

// DELETE /api/couple/photo — remove couple photo
export async function DELETE(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.uid)
    .single()

  if (!me?.couple_id) return NextResponse.json({ error: "No estás vinculado" }, { status: 400 })

  await supabase.from("couples").update({ photo_url: null }).eq("id", me.couple_id)
  return NextResponse.json({ ok: true })
}
