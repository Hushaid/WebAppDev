"use server"

import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated." }
  }

  const { verifyPassword, hashPassword } = await import("better-auth/crypto")

  // Get the credential account for this user
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.providerId, "credential"),
      ),
    )
    .limit(1)

  if (!account?.password) {
    return { success: false as const, error: "No password set for this account." }
  }

  // Verify current password
  const valid = await verifyPassword({
    hash: account.password,
    password: data.currentPassword,
  })

  if (!valid) {
    return { success: false as const, error: "Current password is incorrect." }
  }

  // Validate new password
  if (data.newPassword.length < 8) {
    return { success: false as const, error: "New password must be at least 8 characters." }
  }

  // Hash and update
  const hashedPassword = await hashPassword(data.newPassword)

  await db
    .update(accounts)
    .set({ password: hashedPassword })
    .where(eq(accounts.id, account.id))

  logAudit({
    actorId: session.user.id,
    action: "change_password",
    entityType: "user",
    entityId: session.user.id,
  }).catch(console.error)

  return { success: true as const }
}
