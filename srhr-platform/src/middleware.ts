import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "@/lib/auth"

const protectedRoutes: Record<string, string[]> = {
  "/admin": ["admin", "super_admin"],
  "/field-worker": ["field_worker", "admin", "super_admin"],
  "/personal": ["personal_user", "admin", "super_admin"],
  "/partners": ["partner", "admin", "super_admin"],
}

/** Maps route prefixes to their role-specific login pages */
const loginRoutes: Record<string, string> = {
  "/admin": "/admin/log-in",
  "/field-worker": "/field-worker/log-in",
  "/partners": "/partners/log-in",
  "/personal": "/log-in",
}

/** Roles that require MFA to access their routes */
const MFA_REQUIRED_ROLES = ["admin", "super_admin", "partner"]

const publicPaths = [
  "/log-in",
  "/create-account",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/mfa",
  "/admin/log-in",
  "/field-worker/log-in",
  "/field-worker/register",
  "/partners/log-in",
]

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

  // Get the login URL for this route group
  const loginUrl = loginRoutes[matchedRoute] ?? "/log-in"

  if (!session) {
    return NextResponse.redirect(new URL(loginUrl, request.url))
  }

  // Check role authorization
  const allowedRoles = protectedRoutes[matchedRoute]
  const user = session.user as {
    role?: string
    twoFactorEnabled?: boolean
  }
  const userRole = user.role

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Authenticated but wrong role — redirect to home for role-based routing
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Enforce MFA for admin and partner roles
  if (MFA_REQUIRED_ROLES.includes(userRole)) {
    if (!user.twoFactorEnabled) {
      // Redirect to MFA setup page if MFA not yet enabled
      return NextResponse.redirect(new URL("/mfa/setup", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|hushaid-logo-mark\\.svg|hushaid-full-logo-new\\.svg|api/auth|sw\\.js).*)",
  ],
}
