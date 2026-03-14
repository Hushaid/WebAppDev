"use server"

import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import crypto from "node:crypto"
import { logAudit } from "@/lib/audit"

export async function generateAccessCode(issuedBy: string) {
  const code = crypto.randomBytes(4).toString("hex").toUpperCase()

  const [inserted] = await db.insert(fieldWorkerCodes).values({
    codeValue: code,
    issuedBy,
  }).returning()

  logAudit({
    actorId: issuedBy,
    action: "generate",
    entityType: "access_code",
    entityId: inserted.id,
  }).catch(console.error)

  revalidatePath("/admin/access-codes")
  return { code }
}

export async function revokeAccessCode(codeId: string) {
  await db
    .update(fieldWorkerCodes)
    .set({ revoked: true })
    .where(eq(fieldWorkerCodes.id, codeId))

  logAudit({
    action: "revoke",
    entityType: "access_code",
    entityId: codeId,
  }).catch(console.error)

  revalidatePath("/admin/access-codes")
}

export async function getAccessCodes() {
  return db.select().from(fieldWorkerCodes).orderBy(fieldWorkerCodes.issuedAt)
}
