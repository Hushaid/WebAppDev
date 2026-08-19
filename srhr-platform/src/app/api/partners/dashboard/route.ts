import { NextResponse } from "next/server"
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  questionResponses,
  questions,
  riskClassifications,
  submissions,
} from "@/lib/db/schema"

type RiskLevel = "low" | "medium" | "high"
type DiseaseGroup = "all" | "sti" | "maternal_health" | "community_wellbeing"

interface SubmissionAnalyticsRow {
  id: string
  gpsLat: string | null
  gpsLng: string | null
  createdAt: string
  stiScore: number
  stiRiskLevel: RiskLevel
  maternalScore: number | null
  maternalRiskLevel: RiskLevel | null
  communityWellbeingScore: number
  communityWellbeingRiskLevel: RiskLevel
  overallRiskLevel: RiskLevel
  aggregateScore: number
}

interface EnrichedSubmission extends SubmissionAnalyticsRow {
  sex: string
  ageGroup: string
  locationName: string
}

function normalizeLocation(value: string | null | undefined) {
  if (!value) return "Unknown"
  const trimmed = value.trim().replace(/\s+/g, " ")
  return trimmed.length > 0 ? trimmed : "Unknown"
}

function deriveOverallRiskLevel(levels: RiskLevel[]) {
  if (levels.includes("high")) return "high"
  if (levels.includes("medium")) return "medium"
  return "low"
}

function avg(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function groupScore(row: EnrichedSubmission, group: DiseaseGroup): number {
  if (group === "sti") return row.stiScore
  if (group === "maternal_health") return row.maternalScore ?? row.aggregateScore
  if (group === "community_wellbeing") return row.communityWellbeingScore
  return row.aggregateScore
}

function groupRiskLevel(row: EnrichedSubmission, group: DiseaseGroup): RiskLevel {
  if (group === "sti") return row.stiRiskLevel
  if (group === "maternal_health") return row.maternalRiskLevel ?? row.overallRiskLevel
  if (group === "community_wellbeing") return row.communityWellbeingRiskLevel
  return row.overallRiskLevel
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
  const riskLevel = searchParams.get("riskLevel") ?? "all"
  const diseaseGroup = (searchParams.get("diseaseGroup") ?? "all") as DiseaseGroup
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const [demographicQuestions] = await Promise.all([
    db
      .select({ id: questions.id, questionNumber: questions.questionNumber })
      .from(questions)
      .where(inArray(questions.questionNumber, ["Q2", "Q3", "Q5"])),
  ])

  const questionIdByNumber = demographicQuestions.reduce<Record<string, string>>(
    (acc, question) => {
      acc[question.questionNumber] = question.id
      return acc
    },
    {},
  )

  const conditions = []
  if (dateFrom) {
    conditions.push(gte(submissions.createdAt, new Date(dateFrom)))
  }
  if (dateTo) {
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)
    conditions.push(lte(submissions.createdAt, toDate))
  }
  if (riskLevel !== "all") {
    if (diseaseGroup === "sti") {
      conditions.push(eq(riskClassifications.stiRiskLevel, riskLevel as RiskLevel))
    } else if (diseaseGroup === "maternal_health") {
      conditions.push(eq(riskClassifications.maternalRiskLevel, riskLevel as RiskLevel))
    } else if (diseaseGroup === "community_wellbeing") {
      conditions.push(eq(riskClassifications.communityWellbeingRiskLevel, riskLevel as RiskLevel))
    } else {
      conditions.push(eq(riskClassifications.overallRiskLevel, riskLevel as RiskLevel))
    }
  }
  if (diseaseGroup === "maternal_health") {
    conditions.push(gte(riskClassifications.maternalScore, 0))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const baseRows = await db
    .select({
      id: submissions.id,
      gpsLat: submissions.gpsLat,
      gpsLng: submissions.gpsLng,
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
    .innerJoin(
      riskClassifications,
      eq(riskClassifications.submissionId, submissions.id),
    )
    .where(whereClause)
    .orderBy(desc(submissions.createdAt))

  if (baseRows.length === 0) {
    return NextResponse.json({
      areas: [],
      trend: [],
      locationOptions: [],
      summary: {
        monitoredAreas: 0,
        hotspots: 0,
        highRiskAreas: 0,
        highRiskSubmissions: 0,
        totalSubmissions: 0,
      },
    })
  }

  const submissionIds = baseRows.map((row) => row.id)
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
  >((acc, response) => {
    const current = acc[response.submissionId] ?? {}
    if (response.questionId === questionIdByNumber.Q2) {
      current.locationName = normalizeLocation(response.responseValue)
    }
    if (response.questionId === questionIdByNumber.Q3) {
      current.sex = response.responseValue
    }
    if (response.questionId === questionIdByNumber.Q5) {
      current.ageGroup = response.responseValue
    }
    acc[response.submissionId] = current
    return acc
  }, {})

  const enrichedRows: EnrichedSubmission[] = baseRows.map((row) => {
    const demographics = demographicsBySubmission[row.id] ?? {}
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      sex: demographics.sex ?? "unknown",
      ageGroup: demographics.ageGroup ?? "unknown",
      locationName: demographics.locationName ?? "Unknown",
    }
  })

  const demographicFilteredRows = enrichedRows.filter((row) => {
    if (sex !== "all" && row.sex !== sex) return false
    if (ageGroup !== "all" && row.ageGroup !== ageGroup) return false
    return true
  })

  const locationOptions = Array.from(
    new Set(
      demographicFilteredRows
        .map((row) => row.locationName)
        .filter((value) => value !== "Unknown"),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const fullyFilteredRows = demographicFilteredRows.filter((row) => {
    if (location !== "all" && row.locationName !== location) return false
    return true
  })

  const groupedAreas = new Map<
    string,
    {
      locationName: string
      latValues: number[]
      lngValues: number[]
      overallScores: number[]
      stiScores: number[]
      maternalScores: number[]
      communityScores: number[]
      overallLevels: RiskLevel[]
      submissionCount: number
      latestComputedAt: string
      highRiskCount: number
    }
  >()

  for (const row of fullyFilteredRows) {
    const key = row.locationName
    const current = groupedAreas.get(key) ?? {
      locationName: row.locationName,
      latValues: [],
      lngValues: [],
      overallScores: [],
      stiScores: [],
      maternalScores: [],
      communityScores: [],
      overallLevels: [],
      submissionCount: 0,
      latestComputedAt: row.createdAt,
      highRiskCount: 0,
    }

    if (row.gpsLat !== null && row.gpsLng !== null) {
      current.latValues.push(Number(row.gpsLat))
      current.lngValues.push(Number(row.gpsLng))
    }
    current.overallScores.push(groupScore(row, diseaseGroup))
    current.stiScores.push(row.stiScore)
    if (row.maternalScore !== null) current.maternalScores.push(row.maternalScore)
    current.communityScores.push(row.communityWellbeingScore)
    current.overallLevels.push(groupRiskLevel(row, diseaseGroup))
    current.submissionCount += 1
    if (groupRiskLevel(row, diseaseGroup) === "high") current.highRiskCount += 1
    if (row.createdAt > current.latestComputedAt) current.latestComputedAt = row.createdAt

    groupedAreas.set(key, current)
  }

  const areas = Array.from(groupedAreas.values())
    .map((group) => ({
      h3_index: group.locationName.toLowerCase().replace(/\s+/g, "_"),
      location_name: group.locationName,
      lat: group.latValues.length > 0 ? avg(group.latValues) : 9.06,
      lng: group.lngValues.length > 0 ? avg(group.lngValues) : 7.49,
      overall_irix_score: avg(group.overallScores),
      overall_risk_level: deriveOverallRiskLevel(group.overallLevels),
      sti_avg_score: avg(group.stiScores),
      maternal_avg_score:
        group.maternalScores.length > 0 ? avg(group.maternalScores) : null,
      community_wellbeing_avg_score: avg(group.communityScores),
      submission_count: group.submissionCount,
      hotspot_flag: group.submissionCount >= 3 && group.highRiskCount >= 1,
      computed_at: group.latestComputedAt,
    }))
    .sort((a, b) => b.overall_irix_score - a.overall_irix_score)

  const trendBuckets = new Map<
    string,
    {
      stiScores: number[]
      maternalScores: number[]
      communityScores: number[]
      overallScores: number[]
      submissions: number
    }
  >()

  for (const row of fullyFilteredRows) {
    const period = row.createdAt.slice(0, 10)
    const current = trendBuckets.get(period) ?? {
      stiScores: [],
      maternalScores: [],
      communityScores: [],
      overallScores: [],
      submissions: 0,
    }
    current.stiScores.push(row.stiScore)
    if (row.maternalScore !== null) current.maternalScores.push(row.maternalScore)
    current.communityScores.push(row.communityWellbeingScore)
    current.overallScores.push(groupScore(row, diseaseGroup))
    current.submissions += 1
    trendBuckets.set(period, current)
  }

  const trend = Array.from(trendBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, bucket]) => ({
      period,
      sti_avg: avg(bucket.stiScores),
      maternal_avg:
        bucket.maternalScores.length > 0 ? avg(bucket.maternalScores) : null,
      community_avg: avg(bucket.communityScores),
      overall: avg(bucket.overallScores),
      submissions: bucket.submissions,
    }))

  const summary = {
    monitoredAreas: areas.length,
    hotspots: areas.filter((area) => area.hotspot_flag).length,
    highRiskAreas: areas.filter((area) => area.overall_risk_level === "high").length,
    highRiskSubmissions: fullyFilteredRows.filter((r) => groupRiskLevel(r, diseaseGroup) === "high").length,
    totalSubmissions: fullyFilteredRows.length,
  }

  return NextResponse.json({
    areas,
    trend,
    locationOptions,
    summary,
  })
}
