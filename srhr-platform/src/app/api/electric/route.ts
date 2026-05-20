import type { NextRequest } from "next/server"

const ELECTRIC_BACKEND_URL =
  process.env.ELECTRIC_BACKEND_URL ?? "http://localhost:3000"

/**
 * Proxy route for Electric SQL sync.
 * Forwards shape requests from the client to the Electric sync engine.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const upstream = new URL("/v1/shape", ELECTRIC_BACKEND_URL)

  // Forward all search params to Electric
  url.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value)
  })

  const response = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
    },
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": response.headers.get("Cache-Control") ?? "no-cache",
      ...(response.headers.get("electric-handle")
        ? { "electric-handle": response.headers.get("electric-handle")! }
        : {}),
      ...(response.headers.get("electric-offset")
        ? { "electric-offset": response.headers.get("electric-offset")! }
        : {}),
    },
  })
}
