import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

const BUCKET = "journal-audio"

// Map common audio mime types to a file extension
function extFor(type: string): string {
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "m4a"
  if (type.includes("ogg")) return "ogg"
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3"
  if (type.includes("wav")) return "wav"
  return "webm"
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  const date = formData.get("date") as string | null

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Field 'file' is required" }, { status: 400 })
  }

  const f = file as File
  const contentType = f.type || "audio/webm"
  const ext = extFor(contentType)
  const timestamp = Date.now()
  const dateStr = date ?? new Date().toISOString().slice(0, 10)
  const path = `${me.couple_id}/${dateStr}-${timestamp}.${ext}`

  const arrayBuffer = await f.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  async function doUpload() {
    return supabase!.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    })
  }

  let { error: uploadError } = await doUpload()

  // Self-heal: if the bucket doesn't exist yet, create it (public) and retry once.
  if (uploadError && /bucket.*not.*found|not.*found/i.test(uploadError.message)) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: "25MB",
    })
    ;({ error: uploadError } = await doUpload())
  }

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl })
}
