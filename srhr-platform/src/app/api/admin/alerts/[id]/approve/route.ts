import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { sendHighRiskAlertEmails } from "@/lib/alerts/trigger"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1)

  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (alert.status !== "pending_review") {
    return NextResponse.json({ error: "Alert is not pending review" }, { status: 400 })
  }

  // Extract submission details from stored message
  const submissionIdMatch = alert.message?.match(/Submission ID:\s*([0-9a-f-]+)/)
  const submissionId = submissionIdMatch?.[1] ?? ""

  const aggregateScoreMatch = alert.message?.match(/Aggregate score:\s*(\d+)/)
  const aggregateScore = parseInt(aggregateScoreMatch?.[1] ?? "0", 10)

  const locationMatch = alert.message?.match(/Location:\s*([^.]+)\./)
  const locationParts = locationMatch?.[1]?.trim().split(", ") ?? []
  const gpsLat = locationParts[0] !== "No GPS location captured" ? locationParts[0] : null
  const gpsLng = locationParts[1] ?? null

  // Reconstruct per-domain risk levels from the categories text in the message
  const categoriesMatch = alert.message?.match(/Categories:\s*([^.]+)\./)
  const categoriesStr = categoriesMatch?.[1]?.trim() ?? ""
  const stiRiskLevel = categoriesStr.includes("STI") ? "high" as const : "low" as const
  const maternalRiskLevel = categoriesStr.includes("Maternal Health") ? "high" as const : null
  const communityWellbeingRiskLevel = categoriesStr.includes("Community Well-being") ? "high" as const : "low" as const

  // Mark the system alert as actioned
  await db
    .update(alerts)
    .set({ status: "actioned", actionedAt: new Date(), updatedAt: new Date() })
    .where(eq(alerts.id, id))

  // Transition pre-created partner/admin pending_review rows → sent and dispatch emails
  await sendHighRiskAlertEmails({
    submissionId,
    overallRiskLevel: alert.riskLevel,
    stiRiskLevel,
    maternalRiskLevel,
    communityWellbeingRiskLevel,
    aggregateScore,
    gpsLat,
    gpsLng,
  }).catch(console.error)

  logAudit({
    actorId: session?.user?.id,
    action: "alert_approved",
    entityType: "alert",
    entityId: id,
  }).catch(console.error)

  revalidatePath("/admin/alerts")
  revalidatePath("/admin/alerts/review")
  revalidatePath("/partners/alerts")

  return NextResponse.json({ success: true })
}
