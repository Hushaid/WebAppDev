import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const IRIX_BACKEND_URL = process.env.IRIX_BACKEND_URL ?? "http://localhost:8001"

/**
 * Proxy requests to the IRIX prediction service.
 * GET /api/irix?path=/api/v1/scores&disease_group=sti
 * POST /api/irix?path=/api/v1/predict (body forwarded)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path") ?? "/health"

  // Forward all query params except 'path'
  const forwardParams = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== "path") forwardParams.set(key, value)
  })

  const url = `${IRIX_BACKEND_URL}${path}?${forwardParams}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "IRIX service unavailable" },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path") ?? "/api/v1/predict"

  const body = await request.json()

  try {
    const res = await fetch(`${IRIX_BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "IRIX service unavailable" },
      { status: 503 },
    )
  }
}
