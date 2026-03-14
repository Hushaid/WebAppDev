"use server"

import { db } from "@/lib/db"
import { fieldWorkerCodes, users, accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { logAudit } from "@/lib/audit"

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

  // 2. Check if email already exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email.toLowerCase()))
    .limit(1)

  if (existingUser) {
    return { success: false as const, error: "An account with this email already exists." }
  }

  // 3. Create user directly in DB (bypass Better Auth's email verification flow)
  const { hashPassword } = await import("better-auth/crypto")
  const hashedPassword = await hashPassword(data.password)
  const userId = crypto.randomUUID()

  await db.insert(users).values({
    id: userId,
    email: data.email.toLowerCase(),
    name: data.name,
    role: "field_worker",
    emailVerified: true, // Access code proves legitimacy — no email verification needed
    status: "active",
    mfaEnabled: false,
    failedLoginAttempts: 0,
  })

  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: hashedPassword,
  })

  // 4. Redeem the access code
  await db
    .update(fieldWorkerCodes)
    .set({
      used: true,
      issuedTo: userId,
      usedAt: new Date(),
    })
    .where(eq(fieldWorkerCodes.id, data.codeId))

  // 5. Audit log
  logAudit({
    actorId: userId,
    action: "register",
    entityType: "user",
    entityId: userId,
    metadata: { role: "field_worker", accessCodeId: data.codeId },
  }).catch(console.error)

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
