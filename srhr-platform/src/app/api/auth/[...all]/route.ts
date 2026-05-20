import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"

const TRUSTED_ORIGINS = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  "http://srhr.localhost",
  "http://srhr.localhost:80",
  "http://srhr.localhost:1355",
  "http://localhost:3000",
  "http://localhost:1355",
  "https://hushaid.org",
  "https://www.hushaid.org",
].filter(Boolean) as string[]

const _baseHostname = (() => {
  try {
    const u = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL
    return u ? new URL(u).hostname : null
  } catch {
    return null
  }
})()

function isOriginTrusted(origin: string | null): boolean {
  if (!origin) return false
  if (TRUSTED_ORIGINS.includes(origin)) return true
  if (origin.startsWith("http://srhr.localhost") || origin.startsWith("http://localhost")) return true
  // Trust any scheme/port combination for the configured production hostname
  if (_baseHostname) {
    try {
      return new URL(origin).hostname === _baseHostname
    } catch {
      return false
    }
  }
  return false
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin")
  return isOriginTrusted(origin) ? origin! : TRUSTED_ORIGINS[0] ?? "*"
}

const corsHeaders = (request: NextRequest) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(request),
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
})

const handlers = toNextJsHandler(auth)

async function withCors(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const response = await handler(request)
  const newHeaders = new Headers()

  // Copy all headers except Set-Cookie (handled separately to preserve multiples)
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      newHeaders.set(key, value)
    }
  })

  // Append CORS headers
  Object.entries(corsHeaders(request)).forEach(([k, v]) => newHeaders.set(k, v))

  // Re-append each Set-Cookie header individually so multiple cookies are preserved
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : ([response.headers.get("set-cookie")].filter(Boolean) as string[])

  for (const cookie of setCookies) {
    newHeaders.append("set-cookie", cookie)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "Access-Control-Max-Age": "86400",
    },
  })
}

export async function GET(request: NextRequest) {
  return withCors(request, handlers.GET)
}

export async function POST(request: NextRequest) {
  return withCors(request, handlers.POST)
}

export async function PATCH(request: NextRequest) {
  return withCors(request, handlers.PATCH)
}

export async function PUT(request: NextRequest) {
  return withCors(request, handlers.PUT)
}

export async function DELETE(request: NextRequest) {
  return withCors(request, handlers.DELETE)
}
