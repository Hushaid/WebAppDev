/**
 * Account lockout after failed login attempts.
 *
 * Locks account for 15 minutes after 5 consecutive failed attempts.
 */

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export async function recordFailedLogin(userId: string): Promise<{
  locked: boolean
  remainingAttempts: number
}> {
  const [user] = await db
    .select({
      failedLoginAttempts: users.failedLoginAttempts,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return { locked: false, remainingAttempts: 0 }

  const newCount = (user.failedLoginAttempts ?? 0) + 1

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    // Lock the account
    await db
      .update(users)
      .set({
        failedLoginAttempts: newCount,
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
      })
      .where(eq(users.id, userId))

    return { locked: true, remainingAttempts: 0 }
  }

  await db
    .update(users)
    .set({ failedLoginAttempts: newCount })
    .where(eq(users.id, userId))

  return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - newCount }
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId))
}

export async function isAccountLocked(userId: string): Promise<{
  locked: boolean
  lockedUntil: Date | null
}> {
  const [user] = await db
    .select({ lockedUntil: users.lockedUntil })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user?.lockedUntil) return { locked: false, lockedUntil: null }

  if (user.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: user.lockedUntil }
  }

  // Lock expired — reset
  await resetFailedLogins(userId)
  return { locked: false, lockedUntil: null }
}
