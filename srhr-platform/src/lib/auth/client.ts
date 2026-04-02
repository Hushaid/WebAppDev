"use client"

import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins"
import type { auth } from "@/lib/auth"

// Use current origin when available (same-origin = no CORS). Fallback to env for SSR.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"

export const authClient = createAuthClient({
  baseURL,
  plugins: [twoFactorClient(), inferAdditionalFields<typeof auth>()],
})

export const { signIn, signUp, signOut, useSession } = authClient
