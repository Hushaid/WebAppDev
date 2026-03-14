"use server"

import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"

export async function logAudit(params: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
}) {
  try {
    await db.insert(auditLog).values({
      actorId: params.actorId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      metadata: params.metadata ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
    })
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Failed to write audit log:", error)
  }
}
