/**
 * Alert trigger system.
 *
 * High-risk flow:
 *   1. One system-level pending_review alert created (no recipientId)
 *   2. Email sent immediately to all super-admins — "please review"
 *   3. Super-admin approves → emails sent to partners + admins (not super-admins again)
 *      + alert records created for partners + admins on their alerts pages
 *
 * Medium-risk flow:
 *   Dashboard-only alert records for partners/admins/super-admins. No email.
 */

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
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

function buildAlertContent(payload: HighRiskAlertPayload) {
  const targetLevels = ["high"]
  const highCategories = [
    targetLevels.includes(payload.stiRiskLevel) ? "STI" : null,
    payload.maternalRiskLevel && targetLevels.includes(payload.maternalRiskLevel) ? "Maternal Health" : null,
    targetLevels.includes(payload.communityWellbeingRiskLevel) ? "Community Well-being" : null,
  ].filter(Boolean) as string[]

  const locationText = payload.gpsLat
    ? `${parseFloat(payload.gpsLat).toFixed(4)}, ${parseFloat(payload.gpsLng!).toFixed(4)}`
    : "No GPS location captured"

  const title = "High Risk Submission Detected"
  const message = [
    `A submission has been classified as HIGH risk.`,
    `Categories: ${highCategories.join(", ") || "N/A"}.`,
    `Aggregate score: ${payload.aggregateScore}.`,
    `Location: ${locationText}.`,
    `Submission ID: ${payload.submissionId}.`,
  ].join(" ")

  return { title, message, highCategories, locationText }
}

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const emailFrom = () => process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"
const baseUrl = () => process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/**
 * Called on approval. Transitions pre-created pending_review rows for partners/admins
 * to "sent" and dispatches emails. Falls back to INSERT for legacy rows created before
 * the upfront-creation change.
 */
export async function sendHighRiskAlertEmails(payload: HighRiskAlertPayload) {
  const { highCategories, locationText } = buildAlertContent(payload)
  const title = `High Risk Submission Detected`
  const base = baseUrl()
  const resend = getResend()

  // Update pre-created pending_review rows for this submission → sent
  const submissionPattern = `%Submission ID: ${payload.submissionId}%`
  const updatedRows = await db
    .update(alerts)
    .set({ status: "sent" as const, sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        sql`${alerts.message} LIKE ${submissionPattern}`,
        isNotNull(alerts.recipientId),
        eq(alerts.status, "pending_review"),
      ),
    )
    .returning({ recipientId: alerts.recipientId })

  let recipients: { id: string; email: string; name: string | null; role: string }[]

  if (updatedRows.length > 0) {
    const recipientIds = updatedRows.map((r) => r.recipientId).filter((id): id is string => id != null)
    recipients = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(inArray(users.id, recipientIds))
  } else {
    // Legacy path: no pre-created rows exist (submission from before upfront-creation change)
    const { message } = buildAlertContent(payload)
    recipients = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(inArray(users.role, ["partner", "admin"]))
    if (recipients.length > 0) {
      await db.insert(alerts).values(
        recipients.map((r) => ({
          type: "high_risk_individual" as const,
          recipientId: r.id,
          riskLevel: "high" as const,
          status: "sent" as const,
          sentAt: new Date(),
          title,
          message,
        })),
      )
    }
  }

  if (recipients.length === 0 || !resend) return

  for (const recipient of recipients) {
    const isAdmin = recipient.role === "admin"
    const alertsUrl = isAdmin ? `${base}/admin/alerts` : `${base}/partners/alerts`
    const submissionUrl = isAdmin ? `${base}/admin/submissions/${payload.submissionId}` : null

    try {
      await resend.emails.send({
        from: emailFrom(),
        to: recipient.email,
        subject: `🚨 ${title}`,
        html: buildEmailHtml({
          recipientName: recipient.name,
          highCategories,
          aggregateScore: payload.aggregateScore,
          locationText,
          alertsUrl,
          submissionUrl,
        }),
      })
    } catch (error) {
      console.error(`Failed to send alert email to ${recipient.email}:`, error)
    }
  }
}

function buildEmailHtml({
  recipientName,
  highCategories,
  aggregateScore,
  locationText,
  alertsUrl,
  submissionUrl,
}: {
  recipientName: string | null
  highCategories: string[]
  aggregateScore: number
  locationText: string
  alertsUrl: string
  submissionUrl: string | null
}) {
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #dc2626;">⚠️ High Risk Submission Alert</h2>
      <p>Hi ${recipientName || "there"},</p>
      <p>A questionnaire submission has been classified as <strong style="color: #dc2626;">HIGH RISK</strong> and reviewed by the Hushaid team.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Categories</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${highCategories.join(", ") || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Aggregate Score</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${aggregateScore}</td>
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
      <p style="color: #94a3b8; font-size: 12px;">Hushaid — Confidential health assessments for Nigerian communities.</p>
    </div>
  `
}

/**
 * Triggers on a high-risk submission:
 * 1. Creates ONE system-level pending_review alert (no recipientId)
 * 2. Emails all super-admins to notify them of the pending review
 */
export async function triggerHighRiskAlert(payload: HighRiskAlertPayload) {
  const isHigh = payload.overallRiskLevel === "high"
  const isMedium = payload.overallRiskLevel === "medium"
  if (!isHigh && !isMedium) return

  const { title, message, highCategories, locationText } = buildAlertContent(payload)

  if (isHigh) {
    // One system-level alert (no recipient — belongs to the event, drives the review queue)
    await db.insert(alerts).values({
      type: "high_risk_individual" as const,
      recipientId: null,
      riskLevel: "high" as const,
      status: "pending_review" as const,
      title,
      message,
    })

    // Create per-recipient pending_review rows for partners/admins immediately so they
    // see the alert in their dashboard without waiting for super-admin approval.
    // Email dispatch is still gated — sendHighRiskAlertEmails runs after approval.
    const partnerAdminRecipients = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ["partner", "admin"]))

    if (partnerAdminRecipients.length > 0) {
      await db.insert(alerts).values(
        partnerAdminRecipients.map((r) => ({
          type: "high_risk_individual" as const,
          recipientId: r.id,
          riskLevel: "high" as const,
          status: "pending_review" as const,
          title,
          message,
        })),
      )
    }

    // Email all super-admins immediately so they know to review
    const superAdmins = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.role, "super_admin"))

    const resend = getResend()
    if (resend && superAdmins.length > 0) {
      const base = baseUrl()
      const reviewUrl = `${base}/admin/alerts/review`

      for (const sa of superAdmins) {
        try {
          await resend.emails.send({
            from: emailFrom(),
            to: sa.email,
            subject: `🔔 High Risk Alert Pending Review`,
            html: `
              <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
                <h2 style="color: #d97706;">🔔 Alert Pending Your Review</h2>
                <p>Hi ${sa.name || "there"},</p>
                <p>A <strong>HIGH RISK</strong> submission requires your review before partners are notified.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Categories</td>
                    <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${highCategories.join(", ") || "N/A"}</td>
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
                <a href="${reviewUrl}" style="display: inline-block; background: #d97706; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
                  Review Alert
                </a>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">Hushaid — Confidential health assessments for Nigerian communities.</p>
              </div>
            `,
          })
        } catch (error) {
          console.error(`Failed to send review email to super-admin ${sa.email}:`, error)
        }
      }
    }
    return
  }

  // Medium risk: dashboard-only records for partners/admins/super-admins, no email
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["partner", "admin", "super_admin"]))

  if (recipients.length === 0) return

  await db.insert(alerts).values(
    recipients.map((r) => ({
      type: "high_risk_individual" as const,
      recipientId: r.id,
      riskLevel: "medium" as const,
      status: "pending" as const,
      title,
      message,
    }))
  )
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
    .where(inArray(users.role, ["partner", "admin", "super_admin"]))

  if (recipients.length === 0) return

  const title = "IRIX Hotspot Detected"
  const message = `A geographic area has been flagged as a ${riskLevel.toUpperCase()} risk hotspot with IRIX score ${irixScore.toFixed(2)}.`

  await db.insert(alerts).values(
    recipients.map((r) => ({
      type: "threshold_breach" as const,
      recipientId: r.id,
      geographicUnitId,
      riskLevel,
      status: "pending" as const,
      title,
      message,
    }))
  )
}
