"use server"

import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import crypto from "node:crypto"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

const PAGE_SIZE = 10

async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session?.user as { role?: string })?.role
  if (role !== "super_admin") throw new Error("Unauthorized: super admin only.")
  return session!
}

export async function generateAccessCode(issuedBy: string) {
  await requireSuperAdmin()
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
  await requireSuperAdmin()
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

export async function deleteAccessCode(codeId: string) {
  await requireSuperAdmin()
  await db
    .delete(fieldWorkerCodes)
    .where(eq(fieldWorkerCodes.id, codeId))

  logAudit({
    action: "delete",
    entityType: "access_code",
    entityId: codeId,
  }).catch(console.error)

  revalidatePath("/admin/access-codes")
}

export async function getAccessCodes(page: number = 1) {
  const offset = (page - 1) * PAGE_SIZE

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fieldWorkerCodes)

  const items = await db
    .select()
    .from(fieldWorkerCodes)
    .orderBy(fieldWorkerCodes.issuedAt)
    .limit(PAGE_SIZE)
    .offset(offset)

  return {
    items,
    total: countResult.count,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(countResult.count / PAGE_SIZE),
  }
}
