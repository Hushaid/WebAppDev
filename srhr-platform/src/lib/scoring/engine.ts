import {
  SCORED_QUESTIONS,
  SKIP_RULES,
  MATERNAL_QUESTIONS,
  type QuestionConfig,
} from "./questions-config"
import {
  classifyRisk,
  STI_THRESHOLDS,
  MATERNAL_THRESHOLDS,
  COMMUNITY_WELLBEING_THRESHOLDS,
  type RiskLevel,
} from "./thresholds"

export interface QuestionResponse {
  questionId: string
  value: string
}

export interface RiskResult {
  stiScore: number
  stiRiskLevel: RiskLevel
  maternalScore: number | null
  maternalRiskLevel: RiskLevel | null
  communityWellbeingScore: number
  communityWellbeingRiskLevel: RiskLevel
  overallRiskLevel: RiskLevel
  aggregateScore: number
  skippedQuestions: string[]
  responseScores: Record<string, number>
}

/**
 * Pure function: computes risk classification from questionnaire responses.
 * Runs on both client and server.
 */
export function computeRisk(
  responses: QuestionResponse[],
  sex: "male" | "female",
): RiskResult {
  const responseMap = new Map(responses.map((r) => [r.questionId, r.value]))
  const skippedQuestions = new Set<string>()

  // Apply gender-based skip: males skip maternal health questions
  if (sex === "male") {
    for (const qId of MATERNAL_QUESTIONS) {
      skippedQuestions.add(qId)
    }
  }

  // Apply conditional skip rules
  for (const rule of SKIP_RULES) {
    const responseValue = responseMap.get(rule.questionId)
    if (responseValue && rule.skipWhen.includes(responseValue)) {
      for (const target of rule.skipTargets) {
        skippedQuestions.add(target)
      }
    }
  }

  // Score each question
  const responseScores: Record<string, number> = {}
  let stiScore = 0
  let maternalScore = 0
  let communityWellbeingScore = 0

  for (const question of SCORED_QUESTIONS) {
    if (skippedQuestions.has(question.id)) {
      responseScores[question.id] = 0
      continue
    }

    // Q23 is not scored
    if (question.maxScore === 0) {
      responseScores[question.id] = 0
      continue
    }

    const responseValue = responseMap.get(question.id)
    const score = scoreQuestion(question, responseValue)
    responseScores[question.id] = score

    switch (question.diseaseGroup) {
      case "sti":
        stiScore += score
        break
      case "maternal_health":
        maternalScore += score
        break
      case "community_wellbeing":
        communityWellbeingScore += score
        break
    }
  }

  const stiRiskLevel = classifyRisk(stiScore, STI_THRESHOLDS)

  const maternalRiskLevel =
    sex === "female"
      ? classifyRisk(maternalScore, MATERNAL_THRESHOLDS)
      : null

  const communityWellbeingRiskLevel = classifyRisk(
    communityWellbeingScore,
    COMMUNITY_WELLBEING_THRESHOLDS,
  )

  // Overall risk: worst-of logic — any High → overall High
  const allLevels: RiskLevel[] = [stiRiskLevel, communityWellbeingRiskLevel]
  if (maternalRiskLevel) {
    allLevels.push(maternalRiskLevel)
  }

  let overallRiskLevel: RiskLevel = "low"
  if (allLevels.includes("high")) {
    overallRiskLevel = "high"
  } else if (allLevels.includes("medium")) {
    overallRiskLevel = "medium"
  }

  const aggregateScore =
    stiScore + (sex === "female" ? maternalScore : 0) + communityWellbeingScore

  return {
    stiScore,
    stiRiskLevel,
    maternalScore: sex === "female" ? maternalScore : null,
    maternalRiskLevel,
    communityWellbeingScore,
    communityWellbeingRiskLevel,
    overallRiskLevel,
    aggregateScore,
    skippedQuestions: Array.from(skippedQuestions),
    responseScores,
  }
}

function scoreQuestion(
  question: QuestionConfig,
  responseValue: string | undefined,
): number {
  if (!responseValue) return 0

  const option = question.options.find((o) => o.value === responseValue)
  return option?.score ?? 0
}
