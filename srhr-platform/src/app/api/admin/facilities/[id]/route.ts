import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { healthFacilities } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function requireSuperAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === "super_admin" ? session : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin(request)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized: super admin only." }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const type = typeof body.type === "string" ? body.type.trim() : ""

  if (!name || !type) {
    return NextResponse.json({ success: false, error: "Facility name and type are required." }, { status: 400 })
  }

  await db.update(healthFacilities).set({
    name,
    type,
    address: normalizeOptionalString(body.address),
    ward: normalizeOptionalString(body.ward),
    lga: normalizeOptionalString(body.lga),
    gpsLat: normalizeOptionalString(body.gpsLat),
    gpsLng: normalizeOptionalString(body.gpsLng),
    updatedAt: new Date(),
  }).where(eq(healthFacilities.id, id))

  logAudit({
    actorId: session.user.id,
    action: "update",
    entityType: "health_facility",
    entityId: id,
  }).catch(console.error)

  revalidatePath("/admin/facilities")
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin(request)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized: super admin only." }, { status: 403 })
  }

  const { id } = await params
  await db.delete(healthFacilities).where(eq(healthFacilities.id, id))

  logAudit({
    actorId: session.user.id,
    action: "delete",
    entityType: "health_facility",
    entityId: id,
  }).catch(console.error)

  revalidatePath("/admin/facilities")
  return NextResponse.json({ success: true })
}
