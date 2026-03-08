import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "@/lib/auth"

const protectedRoutes: Record<string, string[]> = {
  "/admin": ["admin", "super_admin"],
  "/field-worker": ["field_worker", "admin", "super_admin"],
  "/personal": ["personal_user", "admin", "super_admin"],
  "/partners": ["partner", "gis_analyst", "admin", "super_admin"],
}

const publicPaths = ["/sign-in", "/sign-up", "/api/auth"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if this is a protected route
  const matchedRoute = Object.keys(protectedRoutes).find((route) =>
    pathname.startsWith(route),
  )

  if (!matchedRoute) {
    return NextResponse.next()
  }

  // Fetch session from Better Auth
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  )

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  // Check role authorization
  const allowedRoles = protectedRoutes[matchedRoute]
  const userRole = (session.user as { role?: string }).role

  if (!userRole || !allowedRoles.includes(userRole)) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
}
