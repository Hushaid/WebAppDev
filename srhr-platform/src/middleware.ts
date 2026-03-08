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

/** Roles that require MFA to access their routes */
const MFA_REQUIRED_ROLES = ["admin", "super_admin", "partner", "gis_analyst"]

const publicPaths = ["/sign-in", "/sign-up", "/api/auth", "/mfa"]

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
  const user = session.user as {
    role?: string
    mfaEnabled?: boolean
    twoFactorVerified?: boolean
  }
  const userRole = user.role

  if (!userRole || !allowedRoles.includes(userRole)) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  // Enforce MFA for admin and partner roles
  if (MFA_REQUIRED_ROLES.includes(userRole)) {
    if (!user.mfaEnabled) {
      // Redirect to MFA setup page if MFA not yet enabled
      return NextResponse.redirect(new URL("/mfa/setup", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|sw\\.js).*)",
  ],
}
