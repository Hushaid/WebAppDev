import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import {
  submissions,
  questionResponses,
  riskClassifications,
} from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"
import {
  computeRisk,
  type QuestionResponse,
} from "@/lib/scoring/engine"
import { SCORED_QUESTIONS } from "@/lib/scoring/questions-config"
import { triggerHighRiskAlert } from "@/lib/alerts/trigger"

interface SubmissionPayload {
  submitterId: string
  submitterType: "field_worker" | "personal_user"
  questionnaireVersionId: string
  subjectId?: string
  gpsLat?: string
  gpsLng?: string
  sex: "male" | "female"
  responses: Record<string, string>
  clientSubmissionId?: string
}

/** Dedup window: reject submissions from same submitter within 2 minutes */
const DEDUP_WINDOW_MS = 2 * 60 * 1000
/** GPS proximity threshold in degrees (~100m at equator) */
const GPS_PROXIMITY_DEG = 0.001

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmissionPayload

    // 1. Duplicate detection
    // a) Check by clientSubmissionId (offline sync retries)
    if (body.clientSubmissionId) {
      const [existing] = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.clientSubmissionId, body.clientSubmissionId))
        .limit(1)

      if (existing) {
        // Already processed — return existing ID (idempotent)
        const [existingClassification] = await db
          .select()
          .from(riskClassifications)
          .where(eq(riskClassifications.submissionId, existing.id))
          .limit(1)

        return NextResponse.json({
          submissionId: existing.id,
          classification: existingClassification ?? null,
          duplicate: true,
        })
      }
    }

    // b) Same submitter + GPS proximity + time window dedup
    if (body.gpsLat && body.gpsLng) {
      const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS)
      const lat = parseFloat(body.gpsLat)
      const lng = parseFloat(body.gpsLng)

      const [nearbyRecent] = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.submitterId, body.submitterId),
            gte(submissions.createdAt, windowStart),
            sql`abs(${submissions.gpsLat}::double precision - ${lat}) < ${GPS_PROXIMITY_DEG}`,
            sql`abs(${submissions.gpsLng}::double precision - ${lng}) < ${GPS_PROXIMITY_DEG}`,
          ),
        )
        .limit(1)

      if (nearbyRecent) {
        return NextResponse.json(
          { error: "Duplicate submission detected (same location within 2 minutes)" },
          { status: 409 },
        )
      }
    }

    // 2. Insert submission
    const [submission] = await db
      .insert(submissions)
      .values({
        subjectId: body.subjectId ?? null,
        submitterId: body.submitterId,
        submitterType: body.submitterType,
        questionnaireVersionId: body.questionnaireVersionId,
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
        clientSubmissionId: body.clientSubmissionId ?? null,
      })
      .returning()

    // 3. Insert individual question responses with scores
    const questionResponseValues = Object.entries(body.responses)
      .filter(([questionId]) => {
        const config = SCORED_QUESTIONS.find((q) => q.id === questionId)
        return config !== undefined
      })
      .map(([questionId, responseValue]) => {
        const config = SCORED_QUESTIONS.find((q) => q.id === questionId)!
        const option = config.options.find((o) => o.value === responseValue)
        return {
          submissionId: submission.id,
          questionId,
          responseValue,
          score: option?.score ?? 0,
        }
      })

    if (questionResponseValues.length > 0) {
      await db.insert(questionResponses).values(questionResponseValues)
    }

    // 4. Compute risk classification
    const scoredResponses: QuestionResponse[] = Object.entries(body.responses)
      .filter(([qId]) => SCORED_QUESTIONS.some((q) => q.id === qId))
      .map(([questionId, value]) => ({ questionId, value }))

    const risk = computeRisk(scoredResponses, body.sex)

    // 5. Store risk classification
    const [classification] = await db
      .insert(riskClassifications)
      .values({
        submissionId: submission.id,
        stiScore: risk.stiScore,
        stiRiskLevel: risk.stiRiskLevel,
        maternalScore: risk.maternalScore,
        maternalRiskLevel: risk.maternalRiskLevel,
        communityWellbeingScore: risk.communityWellbeingScore,
        communityWellbeingRiskLevel: risk.communityWellbeingRiskLevel,
        overallRiskLevel: risk.overallRiskLevel,
        aggregateScore: risk.aggregateScore,
      })
      .returning()

    // 6. Trigger high-risk alert (non-blocking)
    if (risk.overallRiskLevel === "high") {
      triggerHighRiskAlert({
        submissionId: submission.id,
        overallRiskLevel: risk.overallRiskLevel,
        stiRiskLevel: risk.stiRiskLevel,
        maternalRiskLevel: risk.maternalRiskLevel,
        communityWellbeingRiskLevel: risk.communityWellbeingRiskLevel,
        aggregateScore: risk.aggregateScore,
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
      }).catch(console.error)
    }

    return NextResponse.json({
      submissionId: submission.id,
      classification,
    })
  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 },
    )
  }
}
