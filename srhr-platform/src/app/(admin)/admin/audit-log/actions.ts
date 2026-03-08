"use server"

import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { eq, desc, like, and } from "drizzle-orm"

export async function getAuditLogs(filters?: {
  action?: string
  entityType?: string
}) {
  const conditions = []

  if (filters?.action) {
    conditions.push(like(auditLog.action, `%${filters.action}%`))
  }
  if (filters?.entityType) {
    conditions.push(eq(auditLog.entityType, filters.entityType))
  }

  const logs = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(200)

  return logs
}
