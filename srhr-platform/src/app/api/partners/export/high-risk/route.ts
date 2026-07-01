import { NextResponse } from "next/server"
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionResponses, questions, riskClassifications, submissions } from "@/lib/db/schema"

type RiskLevel = "low" | "medium" | "high"
type DiseaseGroup = "all" | "sti" | "maternal_health" | "community_wellbeing"

function normalizeLocation(value: string | null | undefined) {
  if (!value) return "Unknown"
  const trimmed = value.trim().replace(/\s+/g, " ")
  return trimmed.length > 0 ? trimmed : "Unknown"
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!role || !["partner", "admin", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sex = searchParams.get("sex") ?? "all"
  const ageGroup = searchParams.get("ageGroup") ?? "all"
  const location = normalizeLocation(searchParams.get("location") ?? "all")
  const riskLevel = (searchParams.get("riskLevel") ?? "all") as RiskLevel | "all"
  const diseaseGroup = (searchParams.get("diseaseGroup") ?? "all") as DiseaseGroup
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const demographicQuestions = await db
    .select({ id: questions.id, questionNumber: questions.questionNumber })
    .from(questions)
    .where(inArray(questions.questionNumber, ["Q2", "Q3", "Q5"]))

  const questionIdByNumber = demographicQuestions.reduce<Record<string, string>>(
    (acc, q) => { acc[q.questionNumber] = q.id; return acc },
    {},
  )

  const conditions = []
  if (dateFrom) conditions.push(gte(submissions.createdAt, new Date(dateFrom)))
  if (dateTo) {
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)
    conditions.push(lte(submissions.createdAt, toDate))
  }

  // Apply risk level filter to the disease-group-specific column
  if (riskLevel !== "all") {
    if (diseaseGroup === "sti") {
      conditions.push(eq(riskClassifications.stiRiskLevel, riskLevel))
    } else if (diseaseGroup === "maternal_health") {
      conditions.push(eq(riskClassifications.maternalRiskLevel, riskLevel))
    } else if (diseaseGroup === "community_wellbeing") {
      conditions.push(eq(riskClassifications.communityWellbeingRiskLevel, riskLevel))
    } else {
      conditions.push(eq(riskClassifications.overallRiskLevel, riskLevel))
    }
  }

  // Restrict to submissions that have maternal data when filtering by that group
  if (diseaseGroup === "maternal_health") {
    conditions.push(gte(riskClassifications.maternalScore, 0))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const baseRows = await db
    .select({
      id: submissions.id,
      createdAt: submissions.createdAt,
      stiScore: riskClassifications.stiScore,
      stiRiskLevel: riskClassifications.stiRiskLevel,
      maternalScore: riskClassifications.maternalScore,
      maternalRiskLevel: riskClassifications.maternalRiskLevel,
      communityWellbeingScore: riskClassifications.communityWellbeingScore,
      communityWellbeingRiskLevel: riskClassifications.communityWellbeingRiskLevel,
      overallRiskLevel: riskClassifications.overallRiskLevel,
      aggregateScore: riskClassifications.aggregateScore,
    })
    .from(submissions)
    .innerJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
    .where(whereClause)
    .orderBy(desc(submissions.createdAt))

  if (baseRows.length === 0) {
    return NextResponse.json({ records: [] })
  }

  const submissionIds = baseRows.map((r) => r.id)
  const demographicResponses = await db
    .select({
      submissionId: questionResponses.submissionId,
      questionId: questionResponses.questionId,
      responseValue: questionResponses.responseValue,
    })
    .from(questionResponses)
    .where(
      and(
        inArray(questionResponses.submissionId, submissionIds),
        inArray(questionResponses.questionId, Object.values(questionIdByNumber)),
      ),
    )

  const demographicsBySubmission = demographicResponses.reduce<
    Record<string, { sex?: string; ageGroup?: string; locationName?: string }>
  >((acc, r) => {
    const current = acc[r.submissionId] ?? {}
    if (r.questionId === questionIdByNumber.Q2) current.locationName = normalizeLocation(r.responseValue)
    if (r.questionId === questionIdByNumber.Q3) current.sex = r.responseValue
    if (r.questionId === questionIdByNumber.Q5) current.ageGroup = r.responseValue
    acc[r.submissionId] = current
    return acc
  }, {})

  const records = baseRows
    .map((row) => {
      const demo = demographicsBySubmission[row.id] ?? {}
      return {
        date: row.createdAt.toISOString().slice(0, 10),
        sex: demo.sex ?? "unknown",
        age_group: demo.ageGroup ?? "unknown",
        location: demo.locationName ?? "Unknown",
        overall_risk_level: row.overallRiskLevel,
        aggregate_score: row.aggregateScore,
        sti_risk_level: row.stiRiskLevel,
        sti_score: row.stiScore,
        maternal_risk_level: row.maternalRiskLevel ?? "N/A",
        maternal_score: row.maternalScore ?? "N/A",
        community_risk_level: row.communityWellbeingRiskLevel,
        community_score: row.communityWellbeingScore,
      }
    })
    .filter((r) => {
      if (sex !== "all" && r.sex.toLowerCase() !== sex.toLowerCase()) return false
      if (ageGroup !== "all" && r.age_group.toLowerCase() !== ageGroup.toLowerCase()) return false
      if (location !== "all" && r.location !== location) return false
      return true
    })

  return NextResponse.json({ records })
}
