import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { healthFacilities } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "super_admin" || !session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized: super admin only." }, { status: 403 })
  }

  const body = await request.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const type = typeof body.type === "string" ? body.type.trim() : ""

  if (!name || !type) {
    return NextResponse.json({ success: false, error: "Facility name and type are required." }, { status: 400 })
  }

  const [inserted] = await db.insert(healthFacilities).values({
    name,
    type,
    address: normalizeOptionalString(body.address),
    ward: normalizeOptionalString(body.ward),
    lga: normalizeOptionalString(body.lga),
    gpsLat: normalizeOptionalString(body.gpsLat),
    gpsLng: normalizeOptionalString(body.gpsLng),
  }).returning()

  logAudit({
    actorId: session.user.id,
    action: "create",
    entityType: "health_facility",
    entityId: inserted.id,
    metadata: { name, type },
  }).catch(console.error)

  revalidatePath("/admin/facilities")
  return NextResponse.json({ success: true })
}
