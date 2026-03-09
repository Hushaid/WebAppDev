/**
 * Alert trigger system.
 *
 * Automatically creates alerts when:
 * 1. An individual submission is classified as HIGH risk
 * 2. IRIX detects a new hotspot
 * 3. Scheduled summary intervals (weekly/monthly)
 */

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"

interface HighRiskAlertPayload {
  submissionId: string
  overallRiskLevel: string
  stiRiskLevel: string
  maternalRiskLevel: string | null
  communityWellbeingRiskLevel: string
  aggregateScore: number
  gpsLat: string | null
  gpsLng: string | null
}

/**
 * Create alerts for all partner/admin users when a high-risk submission arrives.
 */
export async function triggerHighRiskAlert(payload: HighRiskAlertPayload) {
  if (payload.overallRiskLevel !== "high") return

  // Find all partner and admin users to notify
  const recipients = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(
      inArray(users.role, ["partner", "gis_analyst", "admin", "super_admin"]),
    )

  if (recipients.length === 0) return

  const highCategories = [
    payload.stiRiskLevel === "high" ? "STI" : null,
    payload.maternalRiskLevel === "high" ? "Maternal Health" : null,
    payload.communityWellbeingRiskLevel === "high" ? "Community Well-being" : null,
  ].filter(Boolean)

  const title = `High Risk Submission Detected`
  const message = [
    `A submission has been classified as HIGH risk.`,
    `Categories: ${highCategories.join(", ")}.`,
    `Aggregate score: ${payload.aggregateScore}.`,
    payload.gpsLat
      ? `Location: ${parseFloat(payload.gpsLat).toFixed(4)}, ${parseFloat(payload.gpsLng!).toFixed(4)}.`
      : `No GPS location captured.`,
    `Submission ID: ${payload.submissionId}.`,
  ].join(" ")

  const alertValues = recipients.map((r) => ({
    type: "high_risk_individual" as const,
    recipientId: r.id,
    riskLevel: "high" as const,
    status: "pending" as const,
    title,
    message,
  }))

  await db.insert(alerts).values(alertValues)

  // TODO: Send email via Resend to each recipient
  // for (const recipient of recipients) {
  //   await sendAlertEmail(recipient.email, title, message)
  // }
}

/**
 * Create a threshold breach alert when IRIX detects a new hotspot.
 */
export async function triggerHotspotAlert(
  geographicUnitId: string,
  riskLevel: "low" | "medium" | "high",
  irixScore: number,
) {
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(
      inArray(users.role, ["partner", "gis_analyst", "admin", "super_admin"]),
    )

  if (recipients.length === 0) return

  const title = `IRIX Hotspot Detected`
  const message = `A geographic area has been flagged as a ${riskLevel.toUpperCase()} risk hotspot with IRIX score ${irixScore.toFixed(2)}.`

  const alertValues = recipients.map((r) => ({
    type: "threshold_breach" as const,
    recipientId: r.id,
    geographicUnitId,
    riskLevel,
    status: "pending" as const,
    title,
    message,
  }))

  await db.insert(alerts).values(alertValues)
}
