export type DiseaseGroup = "sti" | "maternal_health" | "community_wellbeing"

export interface ScoringOption {
  label: string
  value: string
  score: number
}

export interface QuestionConfig {
  id: string
  diseaseGroup: DiseaseGroup
  maxScore: number
  options: ScoringOption[]
}

/**
 * Q11-Q21: STI Risk Assessment (max 18)
 * Q22-Q36: Maternal Health Assessment (max 21, females only)
 * Q37-Q43: Community Well-being (max 9)
 *
 * Q1-Q10 and Q44-Q45 are demographic/not scored.
 */
export const SCORED_QUESTIONS: QuestionConfig[] = [
  // === STI RISK ASSESSMENT (Q11-Q21) ===
  {
    id: "Q11",
    diseaseGroup: "sti",
    maxScore: 3,
    options: [
      { label: "No symptom", value: "no_symptom", score: 0 },
      { label: "1-2 symptoms", value: "1_2_symptoms", score: 1 },
      { label: "3-4 symptoms", value: "3_4_symptoms", score: 2 },
      { label: ">4 symptoms", value: "more_4_symptoms", score: 3 },
    ],
  },
  {
    id: "Q12",
    diseaseGroup: "sti",
    maxScore: 2,
    options: [
      { label: "0-4 weeks", value: "0_4_weeks", score: 1 },
      { label: ">4 weeks", value: "more_4_weeks", score: 2 },
    ],
  },
  {
    id: "Q13",
    diseaseGroup: "sti",
    maxScore: 2,
    options: [
      { label: "Improving", value: "improving", score: 0 },
      { label: "Stay the same", value: "same", score: 1 },
      { label: "Getting worse", value: "worse", score: 2 },
    ],
  },
  {
    id: "Q14",
    diseaseGroup: "sti",
    maxScore: 2,
    options: [
      { label: "Last 6 months", value: "last_6_months", score: 0 },
      { label: ">6 months", value: "more_6_months", score: 1 },
      { label: "Never tested", value: "never_tested", score: 2 },
    ],
  },
  {
    id: "Q15",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q16",
    diseaseGroup: "sti",
    maxScore: 2,
    options: [
      { label: "Every time", value: "every_time", score: 0 },
      { label: "Sometimes", value: "sometimes", score: 1 },
      { label: "Never", value: "never", score: 2 },
    ],
  },
  {
    id: "Q17",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
      { label: "I'd rather not say", value: "rather_not_say", score: 1 },
    ],
  },
  {
    id: "Q18",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q19",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
      { label: "Not sure", value: "not_sure", score: 1 },
    ],
  },
  {
    id: "Q20",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
      { label: "I would like to but I don't have", value: "want_but_no_access", score: 1 },
    ],
  },
  {
    id: "Q21",
    diseaseGroup: "sti",
    maxScore: 2,
    options: [
      { label: "Any other option", value: "other", score: 1 },
      { label: "Condom", value: "condom", score: 2 },
    ],
  },

  // === MATERNAL HEALTH ASSESSMENT (Q22-Q36, females only) ===
  {
    id: "Q22",
    diseaseGroup: "maternal_health",
    maxScore: 2,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Not sure", value: "not_sure", score: 1 },
      { label: "Yes", value: "yes", score: 2 },
    ],
  },
  {
    id: "Q23",
    diseaseGroup: "maternal_health",
    maxScore: 0,
    options: [],
  },
  {
    id: "Q24",
    diseaseGroup: "maternal_health",
    maxScore: 2,
    options: [
      { label: "Within first 3 months", value: "within_3_months", score: 0 },
      { label: ">3 months", value: "more_3_months", score: 1 },
      { label: "Never", value: "never", score: 2 },
    ],
  },
  {
    id: "Q25",
    diseaseGroup: "maternal_health",
    maxScore: 2,
    options: [
      { label: "No barrier", value: "no_barrier", score: 0 },
      { label: "Health centre far away", value: "far_away", score: 1 },
      { label: "I don't have money", value: "no_money", score: 1 },
      { label: "Cultural reasons", value: "cultural", score: 2 },
      { label: "Not aware of antenatal clinic", value: "not_aware", score: 2 },
    ],
  },
  {
    id: "Q26",
    diseaseGroup: "maternal_health",
    maxScore: 3,
    options: [
      { label: "None", value: "none", score: 0 },
      { label: "1-2 symptoms", value: "1_2_symptoms", score: 1 },
      { label: "3-4 symptoms", value: "3_4_symptoms", score: 2 },
      { label: "5 symptoms", value: "5_symptoms", score: 3 },
    ],
  },
  {
    id: "Q27",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: ">18 years", value: "over_18", score: 0 },
      { label: "<18 years or >35 years", value: "under_18_or_over_35", score: 1 },
    ],
  },
  {
    id: "Q28",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: ">2 years or I have only one child", value: "over_2_years", score: 0 },
      { label: "<2 years", value: "under_2_years", score: 1 },
    ],
  },
  {
    id: "Q29",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "At health centre", value: "health_centre", score: 0 },
      { label: "At home", value: "home", score: 1 },
      { label: "Traditional birth attendant", value: "traditional", score: 1 },
    ],
  },
  {
    id: "Q30",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q31",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "At health centre", value: "health_centre", score: 0 },
      { label: "At home", value: "home", score: 1 },
      { label: "Traditional birth attendant", value: "traditional", score: 1 },
    ],
  },
  {
    id: "Q32",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q33",
    diseaseGroup: "maternal_health",
    maxScore: 2,
    options: [
      { label: "0-1", value: "0_1", score: 0 },
      { label: "2-3", value: "2_3", score: 1 },
      { label: ">3", value: "more_3", score: 2 },
    ],
  },
  {
    id: "Q34",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "Others", value: "others", score: 0 },
      { label: "Pregnant women", value: "pregnant", score: 1 },
      { label: "Nursing mothers", value: "nursing", score: 1 },
      { label: "People living with disability", value: "disability", score: 1 },
    ],
  },
  {
    id: "Q35",
    diseaseGroup: "maternal_health",
    maxScore: 3,
    options: [
      { label: "1-2 answers ticked", value: "1_2_ticked", score: 1 },
      { label: "3-4 answers ticked", value: "3_4_ticked", score: 2 },
      { label: "None of the above", value: "none", score: 3 },
    ],
  },
  {
    id: "Q36",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Not sure", value: "not_sure", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },

  // === COMMUNITY HEALTH WELLBEING (Q37-Q43) ===
  {
    id: "Q37",
    diseaseGroup: "community_wellbeing",
    maxScore: 3,
    options: [
      { label: "Other options", value: "other", score: 1 },
      { label: "CHEW", value: "chew", score: 2 },
      { label: "Trained nurses or doctors", value: "nurses_doctors", score: 3 },
    ],
  },
  {
    id: "Q38",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
    ],
  },
  {
    id: "Q39",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes, I can access health centre", value: "yes", score: 0 },
      { label: "Roads are flooded", value: "flooded", score: 1 },
      { label: "Not sure", value: "not_sure", score: 1 },
    ],
  },
  {
    id: "Q40",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
    ],
  },
  {
    id: "Q41",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "I don't have under 5 children", value: "no_children", score: 0 },
      { label: "No, they are up to date", value: "up_to_date", score: 0 },
      { label: "Yes, they missed some", value: "missed", score: 1 },
    ],
  },
  {
    id: "Q42",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
    ],
  },
  {
    id: "Q43",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
      { label: "Not sure", value: "not_sure", score: 1 },
    ],
  },
]

/**
 * Skip logic rules:
 * - Males skip Q22-Q36 entirely
 * - Q11 = "No symptom" → skip Q12, Q13
 * - Q15 = "No" → skip Q16
 * - Q22 = "No" or "Not sure" → skip Q23-Q30
 */
export interface SkipRule {
  questionId: string
  skipWhen: string[]
  skipTargets: string[]
}

export const SKIP_RULES: SkipRule[] = [
  {
    questionId: "Q11",
    skipWhen: ["no_symptom"],
    skipTargets: ["Q12", "Q13"],
  },
  {
    questionId: "Q15",
    skipWhen: ["no"],
    skipTargets: ["Q16"],
  },
  {
    questionId: "Q22",
    skipWhen: ["no", "not_sure"],
    skipTargets: ["Q23", "Q24", "Q25", "Q26", "Q27", "Q28", "Q29", "Q30"],
  },
]

export const MATERNAL_QUESTIONS = SCORED_QUESTIONS
  .filter((q) => q.diseaseGroup === "maternal_health")
  .map((q) => q.id)
