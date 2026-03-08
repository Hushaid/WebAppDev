import { NextRequest, NextResponse } from "next/server"

const CLIMATE_BACKEND_URL =
  process.env.CLIMATE_BACKEND_URL || "http://localhost:8002"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path") || "/api/v1/flood-risk"

  // Forward query params (except path)
  const forwardParams = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== "path") forwardParams.set(key, value)
  })

  const url = `${CLIMATE_BACKEND_URL}${path}?${forwardParams.toString()}`

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      return NextResponse.json(
        { error: "Climate service error" },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Climate service unavailable" },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path") || "/api/v1/compound-risk"

  const body = await request.json()
  const url = `${CLIMATE_BACKEND_URL}${path}`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: "Climate service error" },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Climate service unavailable" },
      { status: 503 },
    )
  }
}
