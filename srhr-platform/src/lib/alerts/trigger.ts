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
import { eq, inArray } from "drizzle-orm"
import { Resend } from "resend"

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
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(
      inArray(users.role, ["partner", "admin", "super_admin"]),
    )

  if (recipients.length === 0) return

  const highCategories = [
    payload.stiRiskLevel === "high" ? "STI" : null,
    payload.maternalRiskLevel === "high" ? "Maternal Health" : null,
    payload.communityWellbeingRiskLevel === "high" ? "Community Well-being" : null,
  ].filter(Boolean)

  const title = `High Risk Submission Detected`
  const locationText = payload.gpsLat
    ? `${parseFloat(payload.gpsLat).toFixed(4)}, ${parseFloat(payload.gpsLng!).toFixed(4)}`
    : "No GPS location captured"

  const message = [
    `A submission has been classified as HIGH risk.`,
    `Categories: ${highCategories.join(", ")}.`,
    `Aggregate score: ${payload.aggregateScore}.`,
    `Location: ${locationText}.`,
    `Submission ID: ${payload.submissionId}.`,
  ].join(" ")

  // Insert alert records
  const alertValues = recipients.map((r) => ({
    type: "high_risk_individual" as const,
    recipientId: r.id,
    riskLevel: "high" as const,
    status: "pending" as const,
    title,
    message,
  }))

  const insertedAlerts = await db.insert(alerts).values(alertValues).returning()

  // Send email notifications via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const resend = new Resend(resendKey)
  const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    const alertRecord = insertedAlerts[i]

    // Determine URLs based on role
    const isAdmin = recipient.role === "admin" || recipient.role === "super_admin"
    const alertsUrl = isAdmin ? `${baseUrl}/admin/alerts` : `${baseUrl}/partners/alerts`
    const submissionUrl = isAdmin ? `${baseUrl}/admin/submissions/${payload.submissionId}` : null

    try {
      await resend.emails.send({
        from: emailFrom,
        to: recipient.email,
        subject: `🚨 ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ High Risk Submission Alert</h2>
            <p>Hi ${recipient.name || "there"},</p>
            <p>A questionnaire submission has been classified as <strong style="color: #dc2626;">HIGH RISK</strong>.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Categories</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${highCategories.join(", ")}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Aggregate Score</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${payload.aggregateScore}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Location</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${locationText}</td>
              </tr>
            </table>

            <p>Please review and take appropriate action.</p>

            <a href="${alertsUrl}" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 4px 8px 0;">
              View Alerts
            </a>
            ${submissionUrl ? `<a href="${submissionUrl}" style="display: inline-block; background: #11973E; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 0;">View Submission</a>` : ""}

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">Hushaid &mdash; Confidential health assessments for Nigerian communities.</p>
          </div>
        `,
      })

      // Mark alert as sent
      await db
        .update(alerts)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(alerts.id, alertRecord.id))
    } catch (error) {
      console.error(`Failed to send alert email to ${recipient.email}:`, error)
    }
  }
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
      inArray(users.role, ["partner", "admin", "super_admin"]),
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
