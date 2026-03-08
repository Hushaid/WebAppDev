"use server"

import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import crypto from "node:crypto"

export async function generateAccessCode(issuedBy: string) {
  const code = crypto.randomBytes(4).toString("hex").toUpperCase()

  await db.insert(fieldWorkerCodes).values({
    codeValue: code,
    issuedBy,
  })

  revalidatePath("/admin/access-codes")
  return { code }
}

export async function revokeAccessCode(codeId: string) {
  await db
    .update(fieldWorkerCodes)
    .set({ revoked: true })
    .where(eq(fieldWorkerCodes.id, codeId))

  revalidatePath("/admin/access-codes")
}

export async function getAccessCodes() {
  return db.select().from(fieldWorkerCodes).orderBy(fieldWorkerCodes.issuedAt)
}
