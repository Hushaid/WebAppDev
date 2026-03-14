"use server"

import { db } from "@/lib/db"
import { fieldWorkerCodes, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"

export async function validateAccessCode(code: string) {
  const [found] = await db
    .select()
    .from(fieldWorkerCodes)
    .where(
      and(
        eq(fieldWorkerCodes.codeValue, code.toUpperCase().trim()),
        eq(fieldWorkerCodes.used, false),
        eq(fieldWorkerCodes.revoked, false),
      ),
    )
    .limit(1)

  if (!found) {
    return { valid: false as const, error: "Invalid or expired access code." }
  }

  return { valid: true as const, codeId: found.id }
}

export async function registerFieldWorker(data: {
  name: string
  email: string
  password: string
  codeId: string
}) {
  // 1. Re-validate access code to prevent race conditions
  const [code] = await db
    .select()
    .from(fieldWorkerCodes)
    .where(
      and(
        eq(fieldWorkerCodes.id, data.codeId),
        eq(fieldWorkerCodes.used, false),
        eq(fieldWorkerCodes.revoked, false),
      ),
    )
    .limit(1)

  if (!code) {
    return { success: false as const, error: "Access code is no longer valid." }
  }

  // 2. Create the user via Better Auth server-side API
  const result = await auth.api.signUpEmail({
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  })

  if (!result?.user?.id) {
    return { success: false as const, error: "Registration failed. Please try again." }
  }

  const userId = result.user.id

  // 3. Set role to field_worker and auto-verify email (access code proves legitimacy)
  await db
    .update(users)
    .set({ role: "field_worker", emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId))

  // 4. Redeem the access code
  await db
    .update(fieldWorkerCodes)
    .set({
      used: true,
      issuedTo: userId,
      usedAt: new Date(),
    })
    .where(eq(fieldWorkerCodes.id, data.codeId))

  return { success: true as const, userId }
}

export async function redeemAccessCode(codeId: string, userId: string) {
  await db
    .update(fieldWorkerCodes)
    .set({
      used: true,
      issuedTo: userId,
      usedAt: new Date(),
    })
    .where(eq(fieldWorkerCodes.id, codeId))
}
