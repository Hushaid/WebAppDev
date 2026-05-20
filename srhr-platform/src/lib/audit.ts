"use server"

import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { headers } from "next/headers"

export async function logAudit(params: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
}) {
  try {
    // Auto-capture IP from request headers if not explicitly provided
    let ip = params.ipAddress ?? null
    if (!ip) {
      try {
        const headersList = await headers()
        ip =
          headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          headersList.get("x-real-ip") ??
          null
      } catch {
        // headers() may fail outside of request context (e.g. background jobs)
      }
    }

    await db.insert(auditLog).values({
      actorId: params.actorId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      metadata: params.metadata ?? undefined,
      ipAddress: ip ?? undefined,
    })
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Failed to write audit log:", error)
  }
}
