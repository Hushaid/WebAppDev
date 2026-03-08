import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import {
  submissions,
  questionResponses,
  riskClassifications,
} from "@/lib/db/schema"
import {
  computeRisk,
  type QuestionResponse,
} from "@/lib/scoring/engine"
import { SCORED_QUESTIONS } from "@/lib/scoring/questions-config"

interface SubmissionPayload {
  subjectId: string
  submitterId: string
  submitterType: "field_worker" | "personal_user"
  questionnaireVersionId: string
  gpsLat?: string
  gpsLng?: string
  sex: "male" | "female"
  responses: Record<string, string>
  clientSubmissionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmissionPayload

    // 1. Insert submission
    const [submission] = await db
      .insert(submissions)
      .values({
        subjectId: body.subjectId,
        submitterId: body.submitterId,
        submitterType: body.submitterType,
        questionnaireVersionId: body.questionnaireVersionId,
        gpsLat: body.gpsLat ?? null,
        gpsLng: body.gpsLng ?? null,
        clientSubmissionId: body.clientSubmissionId ?? null,
      })
      .returning()

    // 2. Insert individual question responses with scores
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

    // 3. Compute risk classification
    const scoredResponses: QuestionResponse[] = Object.entries(body.responses)
      .filter(([qId]) => SCORED_QUESTIONS.some((q) => q.id === qId))
      .map(([questionId, value]) => ({ questionId, value }))

    const risk = computeRisk(scoredResponses, body.sex)

    // 4. Store risk classification
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
