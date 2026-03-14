import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import {
  submissions,
  questionResponses,
  riskClassifications,
  questionnaires,
  questions,
} from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"
import {
  computeRisk,
  type QuestionResponse,
} from "@/lib/scoring/engine"
import { SCORED_QUESTIONS } from "@/lib/scoring/questions-config"
import { triggerHighRiskAlert } from "@/lib/alerts/trigger"
import { submissionSchema } from "@/lib/utils/validators"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { logAudit } from "@/lib/audit"

/** Dedup window: reject submissions from same submitter within 2 minutes */
const DEDUP_WINDOW_MS = 2 * 60 * 1000
/** GPS proximity threshold in degrees (~100m at equator) */
const GPS_PROXIMITY_DEG = 0.001

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    const rateResult = checkRateLimit(`submission:${ip}`, RATE_LIMITS.submission)
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
          },
        },
      )
    }

    // Input validation
    const rawBody = await request.json()
    const parsed = submissionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission data", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const body = parsed.data

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

    // 2. Resolve questionnaire version ID
    // Frontend sends "v1" — look up the actual UUID from the DB
    let questionnaireVersionId = body.questionnaireVersionId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!isUuid.test(questionnaireVersionId)) {
      // Look up by version number (e.g. "v1" → version 1)
      const versionNum = parseInt(questionnaireVersionId.replace(/\D/g, ""), 10) || 1
      const [q] = await db
        .select({ id: questionnaires.id })
        .from(questionnaires)
        .where(eq(questionnaires.version, versionNum))
        .limit(1)

      if (!q) {
        return NextResponse.json(
          { error: "Questionnaire version not found. Please run the seed script." },
          { status: 400 },
        )
      }
      questionnaireVersionId = q.id
    }

    // 3. Build question number → UUID mapping
    const questionRows = await db
      .select({ id: questions.id, questionNumber: questions.questionNumber })
      .from(questions)
      .where(eq(questions.questionnaireId, questionnaireVersionId))

    const questionNumberToId: Record<string, string> = {}
    for (const row of questionRows) {
      questionNumberToId[row.questionNumber] = row.id
    }

    // 4. Insert submission
    const [submission] = await db
      .insert(submissions)
      .values({
        subjectId: body.subjectId ?? null,
        submitterId: body.submitterId,
        submitterType: body.submitterType,
        questionnaireVersionId,
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
        clientSubmissionId: body.clientSubmissionId ?? null,
      })
      .returning()

    // 5. Insert individual question responses with scores
    const questionResponseValues = Object.entries(body.responses)
      .filter(([questionId]) => {
        // Store all responses that have a matching question in the DB
        return questionNumberToId[questionId] !== undefined
      })
      .map(([questionId, responseValue]) => {
        const config = SCORED_QUESTIONS.find((q) => q.id === questionId)
        const option = config?.options.find((o) => o.value === responseValue)
        // Map question number (Q11, Q12...) to actual UUID
        const resolvedQuestionId = questionNumberToId[questionId]
        return {
          submissionId: submission.id,
          questionId: resolvedQuestionId,
          responseValue,
          score: option?.score ?? 0,
        }
      })

    if (questionResponseValues.length > 0) {
      await db.insert(questionResponses).values(questionResponseValues)
    }

    // 6. Compute risk classification
    const scoredResponses: QuestionResponse[] = Object.entries(body.responses)
      .filter(([qId]) => SCORED_QUESTIONS.some((q) => q.id === qId))
      .map(([questionId, value]) => ({ questionId, value }))

    const risk = computeRisk(scoredResponses, body.sex)

    // 7. Store risk classification
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

    // 8. Audit log (non-blocking)
    logAudit({
      actorId: body.submitterId,
      action: "create",
      entityType: "submission",
      entityId: submission.id,
      metadata: {
        submitterType: body.submitterType,
        overallRiskLevel: risk.overallRiskLevel,
        hasGps: !!(body.gpsLat && body.gpsLng),
      },
      ipAddress: ip,
    }).catch(console.error)

    // 9. Trigger high-risk alert (non-blocking)
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
