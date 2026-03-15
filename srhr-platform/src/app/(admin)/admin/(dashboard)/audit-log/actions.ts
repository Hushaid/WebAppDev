"use server"

import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { eq, desc, like, and, sql } from "drizzle-orm"

const PAGE_SIZE = 10

export async function getAuditLogs(
  page: number = 1,
  filters?: {
    action?: string
    entityType?: string
  },
) {
  const offset = (page - 1) * PAGE_SIZE
  const conditions = []

  if (filters?.action) {
    conditions.push(like(auditLog.action, `%${filters.action}%`))
  }
  if (filters?.entityType) {
    conditions.push(eq(auditLog.entityType, filters.entityType))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(whereClause)

  const items = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      actorId: auditLog.actorId,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
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
