"use server"

import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

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
    return { valid: false, error: "Invalid or expired access code." }
  }

  return { valid: true, codeId: found.id }
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
