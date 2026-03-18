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
  type ThresholdConfig,
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

export interface ScoringConfig {
  questions: QuestionConfig[]
  skipRules: { questionId: string; skipWhen: string[]; skipTargets: string[] }[]
  maternalQuestionIds: string[]
  thresholds?: {
    sti: ThresholdConfig
    maternal: ThresholdConfig
    communityWellbeing: ThresholdConfig
  }
}

/**
 * Pure function: computes risk classification from questionnaire responses.
 * Accepts optional config override (loaded from DB). Falls back to static config.
 */
export function computeRisk(
  responses: QuestionResponse[],
  sex: "male" | "female",
  config?: ScoringConfig,
): RiskResult {
  const scoredQuestions = config?.questions ?? SCORED_QUESTIONS
  const skipRules = config?.skipRules ?? SKIP_RULES
  const maternalQuestionIds = config?.maternalQuestionIds ?? MATERNAL_QUESTIONS

  const responseMap = new Map(responses.map((r) => [r.questionId, r.value]))
  const skippedQuestions = new Set<string>()

  // Apply gender-based skip: males skip maternal health questions
  if (sex === "male") {
    for (const qId of maternalQuestionIds) {
      skippedQuestions.add(qId)
    }
  }

  // Apply conditional skip rules
  for (const rule of skipRules) {
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

  for (const question of scoredQuestions) {
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

  const stiThresholds = config?.thresholds?.sti ?? STI_THRESHOLDS
  const maternalThresholds = config?.thresholds?.maternal ?? MATERNAL_THRESHOLDS
  const cwThresholds = config?.thresholds?.communityWellbeing ?? COMMUNITY_WELLBEING_THRESHOLDS

  const stiRiskLevel = classifyRisk(stiScore, stiThresholds)

  const maternalRiskLevel =
    sex === "female"
      ? classifyRisk(maternalScore, maternalThresholds)
      : null

  const communityWellbeingRiskLevel = classifyRisk(
    communityWellbeingScore,
    cwThresholds,
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

  if (question.type === "checkbox") {
    return scoreCheckboxQuestion(question, responseValue)
  }

  const option = question.options.find((o) => o.value === responseValue)
  return option?.score ?? 0
}

function scoreCheckboxQuestion(question: QuestionConfig, responseValue: string): number {
  // "none" means user explicitly selected "None of the above"
  if (responseValue === "none") {
    // count_shelter: nothing available = highest risk
    return question.checkboxScoring === "count_shelter" ? 3 : 0
  }

  const selected = responseValue.split(",").filter((v) => v && v !== "none")
  if (selected.length === 0) {
    return question.checkboxScoring === "count_shelter" ? 3 : 0
  }

  switch (question.checkboxScoring) {
    case "count_symptom": {
      const n = selected.length
      if (n <= 0) return 0
      if (n <= 2) return 1
      if (n <= 4) return 2
      return 3
    }
    case "count_shelter": {
      const n = selected.length
      if (n <= 2) return 1
      return 2
    }
    case "max": {
      const scores = selected.map((val) => {
        const opt = question.options.find((o) => o.value === val)
        return opt?.score ?? 0
      })
      return Math.max(0, ...scores)
    }
    default:
      return 0
  }
}
