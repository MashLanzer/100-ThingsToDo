import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"

const IMGBB_API_KEY = process.env.IMGBB_API_KEY!

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const imgbbForm = new FormData()
  imgbbForm.append("image", file)
  const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: imgbbForm,
  })
  if (!imgbbRes.ok) return NextResponse.json({ error: "Upload failed" }, { status: 502 })

  const imgbbData = await imgbbRes.json()
  if (!imgbbData?.data?.url) return NextResponse.json({ error: "Invalid response" }, { status: 502 })

  return NextResponse.json({ url: imgbbData.data.url as string })
}
