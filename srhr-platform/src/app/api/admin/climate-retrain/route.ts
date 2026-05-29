import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const CLIMATE_BACKEND_URL = process.env.CLIMATE_BACKEND_URL || "http://localhost:8002"

async function requireAdminSession(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const role = (session.user as { role?: string })?.role
  if (role !== "admin" && role !== "super_admin") return null
  return session
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Forward the multipart form (CSVs) directly to the climate service
  const formData = await request.formData()
  const url = `${CLIMATE_BACKEND_URL}/api/v1/retrain`

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "Climate service unavailable" },
      { status: 503 },
    )
  }
}
