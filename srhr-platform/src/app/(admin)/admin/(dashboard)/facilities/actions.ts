"use server"

import { db } from "@/lib/db"
import { healthFacilities } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session?.user as { role?: string })?.role
  if (role !== "super_admin") throw new Error("Unauthorized: super admin only.")
  return session!
}

export async function createFacility(data: {
  name: string
  type: string
  address?: string
  ward?: string
  lga?: string
  gpsLat?: string
  gpsLng?: string
}) {
  const session = await requireSuperAdmin()

  const [inserted] = await db
    .insert(healthFacilities)
    .values({
      name: data.name,
      type: data.type,
      address: data.address || null,
      ward: data.ward || null,
      lga: data.lga || null,
      gpsLat: data.gpsLat || null,
      gpsLng: data.gpsLng || null,
    })
    .returning()

  logAudit({
    actorId: session.user?.id,
    action: "create",
    entityType: "health_facility",
    entityId: inserted.id,
    metadata: { name: data.name, type: data.type },
  }).catch(console.error)

  revalidatePath("/admin/facilities")
  return { success: true as const }
}

export async function updateFacility(
  facilityId: string,
  data: {
    name: string
    type: string
    address?: string
    ward?: string
    lga?: string
    gpsLat?: string
    gpsLng?: string
  },
) {
  const session = await requireSuperAdmin()

  await db
    .update(healthFacilities)
    .set({
      name: data.name,
      type: data.type,
      address: data.address || null,
      ward: data.ward || null,
      lga: data.lga || null,
      gpsLat: data.gpsLat || null,
      gpsLng: data.gpsLng || null,
      updatedAt: new Date(),
    })
    .where(eq(healthFacilities.id, facilityId))

  logAudit({
    actorId: session.user?.id,
    action: "update",
    entityType: "health_facility",
    entityId: facilityId,
  }).catch(console.error)

  revalidatePath("/admin/facilities")
  return { success: true as const }
}

export async function deleteFacility(facilityId: string) {
  const session = await requireSuperAdmin()

  await db.delete(healthFacilities).where(eq(healthFacilities.id, facilityId))

  logAudit({
    actorId: session.user?.id,
    action: "delete",
    entityType: "health_facility",
    entityId: facilityId,
  }).catch(console.error)

  revalidatePath("/admin/facilities")
  return { success: true as const }
}
