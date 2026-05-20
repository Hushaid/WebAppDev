export type DiseaseGroup = "sti" | "maternal_health" | "community_wellbeing"

export interface ScoringOption {
  label: string
  value: string
  score: number
}

export interface QuestionConfig {
  id: string
  text: string
  diseaseGroup: DiseaseGroup
  maxScore: number
  options: ScoringOption[]
  /** When set to "checkbox", the question renders as multi-select checkboxes */
  type?: "checkbox"
  /**
   * How to compute score from the comma-separated multi-select response:
   * - "count_symptom": 0→0, 1-2→1, 3-4→2, 5+→3  (Q11, Q26)
   * - "count_shelter": 0 available→3, 1-2→1, 3-4→2  (Q35)
   * - "max": max score of selected options  (Q21, Q34, Q37)
   */
  checkboxScoring?: "count_symptom" | "count_shelter" | "max"
}

/**
 * Q11-Q21: STI Risk Assessment (max 18)
 * Q22-Q36: Maternal Health Assessment (max 22, females only)
 * Q37-Q43: Community Well-being (max 9)
 *
 * Q1-Q10 and Q44-Q45 are demographic/not scored.
 */
export const SCORED_QUESTIONS: QuestionConfig[] = [
  // === STI (Sexually Transmitted Infections) Risk Assessment (Q11-Q21) ===
  {
    id: "Q11",
    text: "Have you noticed any of these symptoms lately? Select all that apply.",
    diseaseGroup: "sti",
    maxScore: 3,
    type: "checkbox",
    checkboxScoring: "count_symptom",
    options: [
      { label: "Unusual discharge or smell from private parts", value: "discharge", score: 1 },
      { label: "Sores or blisters", value: "sores", score: 1 },
      { label: "Burning feeling when urinating", value: "burning", score: 1 },
      { label: "Pain during sex", value: "pain_sex", score: 1 },
      { label: "Lower tummy pain", value: "tummy_pain", score: 1 },
      { label: "Fever", value: "fever", score: 1 },
      { label: "Yellow eyes or skin", value: "yellow_eyes", score: 1 },
      { label: "None of the above", value: "none", score: 0 },
    ],
  },
  {
    id: "Q12",
    text: "How long have these symptoms been happening?",
    diseaseGroup: "sti",
    maxScore: 2,
    options: [
      { label: "Less than 1 week", value: "less_1_week", score: 1 },
      { label: "1–4 weeks", value: "1_4_weeks", score: 1 },
      { label: "More than 4 weeks", value: "more_4_weeks", score: 2 },
    ],
  },
  {
    id: "Q13",
    text: "Are the symptoms getting worse, staying the same, or improving?",
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
    text: "When was the last time you had a blood test for HIV or other infections?",
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
    text: "Have you had a sexual partner in the last one year?",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q16",
    text: "How often are you able to use a condom?",
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
    text: "Recently, has anyone forced or pressured you to have sex when you did not want to?",
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
    text: "Have you had to exchange sex for money, food, gifts, or a place to stay?",
    diseaseGroup: "sti",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q19",
    text: "Does your sexual partner have other partners, or any health problems you know about?",
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
    text: "Are you currently using any method to prevent STIs (Sexually Transmitted Infections — diseases passed through sexual contact) or pregnancy?",
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
    text: "Which prevention method are you using? Select all that apply.",
    diseaseGroup: "sti",
    maxScore: 2,
    type: "checkbox",
    checkboxScoring: "max",
    options: [
      { label: "Condoms", value: "condom", score: 2 },
      { label: "Pills", value: "pills", score: 1 },
      { label: "Injection", value: "injection", score: 1 },
      { label: "Implant", value: "implant", score: 1 },
      { label: "IUD / coil", value: "iud", score: 1 },
      { label: "Natural method", value: "natural", score: 1 },
      { label: "Herbs", value: "herbs", score: 1 },
      { label: "None", value: "none", score: 0 },
    ],
  },

  // === MATERNAL HEALTH ASSESSMENT (Q22-Q36, females only) ===
  {
    id: "Q22",
    text: "Are you currently pregnant?",
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
    text: "How many months pregnant are you?",
    diseaseGroup: "maternal_health",
    maxScore: 0,
    options: [
      { label: "Early (1–3 months)", value: "early", score: 0 },
      { label: "Middle (4–6 months)", value: "middle", score: 0 },
      { label: "Late (7 months+)", value: "late", score: 0 },
      { label: "Not sure", value: "not_sure", score: 0 },
    ],
  },
  {
    id: "Q24",
    text: "When was the last time you went for antenatal care (check-ups during pregnancy) during this pregnancy?",
    diseaseGroup: "maternal_health",
    maxScore: 2,
    options: [
      { label: "In the last month", value: "last_month", score: 0 },
      { label: "1–3 months ago", value: "1_3_months", score: 0 },
      { label: "Over 3 months ago", value: "more_3_months", score: 1 },
      { label: "Never", value: "never", score: 2 },
    ],
  },
  {
    id: "Q25",
    text: "What prevents you from attending antenatal care (pregnancy check-ups)?",
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
    text: "Have you experienced any of these in this pregnancy or past pregnancies? Select all that apply.",
    diseaseGroup: "maternal_health",
    maxScore: 3,
    type: "checkbox",
    checkboxScoring: "count_symptom",
    options: [
      { label: "Bad headaches", value: "headaches", score: 1 },
      { label: "Swelling in feet, hands, or face", value: "swelling", score: 1 },
      { label: "Blurred vision", value: "blurred_vision", score: 1 },
      { label: "Unusual bleeding", value: "bleeding", score: 1 },
      { label: "C-section", value: "c_section", score: 1 },
      { label: "High blood pressure", value: "high_bp", score: 1 },
      { label: "High sugar level (diabetes)", value: "high_sugar", score: 1 },
      { label: "None of the above", value: "none", score: 0 },
    ],
  },
  {
    id: "Q27",
    text: "How old were you when you had your first pregnancy?",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "Never been pregnant", value: "never_pregnant", score: 0 },
      { label: ">18 years", value: "over_18", score: 0 },
      { label: "<18 years or >35 years", value: "under_18_or_over_35", score: 1 },
    ],
  },
  {
    id: "Q28",
    text: "What is the time gap between each of your children?",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No children", value: "no_children", score: 0 },
      { label: ">2 years or I have only one child", value: "over_2_years", score: 0 },
      { label: "<2 years", value: "under_2_years", score: 1 },
    ],
  },
  {
    id: "Q29",
    text: "If pregnant now, where do you plan to deliver your baby?",
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
    text: "Are you preparing for delivery and do you have a delivery pack ready? (Soap, gloves, wrapper, baby clothes, cap, socks, towel, delivery pad)",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q31",
    text: "Where did you deliver your previous babies?",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No previous deliveries", value: "no_deliveries", score: 0 },
      { label: "At health centre", value: "health_centre", score: 0 },
      { label: "At home", value: "home", score: 1 },
      { label: "Traditional birth attendant", value: "traditional", score: 1 },
    ],
  },
  {
    id: "Q32",
    text: "Have you ever had a miscarriage (lost a pregnancy before the baby was born)?",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    options: [
      { label: "No", value: "no", score: 0 },
      { label: "Yes", value: "yes", score: 1 },
    ],
  },
  {
    id: "Q33",
    text: "If yes, how many miscarriages have you had?",
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
    text: "Which groups face the greatest health risks related to sexual and reproductive health during flooding? Select all that apply.",
    diseaseGroup: "maternal_health",
    maxScore: 1,
    type: "checkbox",
    checkboxScoring: "max",
    options: [
      { label: "Pregnant women", value: "pregnant", score: 1 },
      { label: "Nursing mothers", value: "nursing", score: 1 },
      { label: "People living with disability", value: "disability", score: 1 },
      { label: "Other groups", value: "others", score: 0 },
    ],
  },
  {
    id: "Q35",
    text: "During floods, which of the following is available in temporary shelters? Select all that apply.",
    diseaseGroup: "maternal_health",
    maxScore: 3,
    type: "checkbox",
    checkboxScoring: "count_shelter",
    options: [
      { label: "Safe delivery spaces", value: "delivery_spaces", score: 0 },
      { label: "Privacy for women", value: "privacy", score: 0 },
      { label: "Menstrual hygiene supplies", value: "hygiene", score: 0 },
      { label: "Violence reporting mechanism", value: "violence_reporting", score: 0 },
      { label: "None of the above", value: "none", score: 0 },
    ],
  },
  {
    id: "Q36",
    text: "During flooding, are there reports of GBV (Gender-Based Violence — physical, sexual, or emotional harm based on someone's gender) in your community?",
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
    text: "Which of the following are available at the health centre in your community? Select all that apply.",
    diseaseGroup: "community_wellbeing",
    maxScore: 3,
    type: "checkbox",
    checkboxScoring: "max",
    options: [
      { label: "Sanitary pads", value: "sanitary_pads", score: 1 },
      { label: "Condoms", value: "condoms", score: 1 },
      { label: "Birth control (pills, injection, or implant)", value: "birth_control", score: 1 },
      { label: "Delivery pack", value: "delivery_pack", score: 1 },
      { label: "Community health workers (CHEW)", value: "chew", score: 2 },
      { label: "Trained nurses or doctors", value: "nurses_doctors", score: 3 },
      { label: "Private rooms", value: "private_rooms", score: 1 },
      { label: "None of the above", value: "none", score: 0 },
    ],
  },
  {
    id: "Q38",
    text: "Is the health centre close enough for you to reach easily?",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
    ],
  },
  {
    id: "Q39",
    text: "During flooding, can you still get to the nearest health centre, or are the roads flooded?",
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
    text: "Were there medicines and drugs available during past floods?",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
    ],
  },
  {
    id: "Q41",
    text: "If you have children under 5 years old, have any of them missed their vaccinations recently due to flooding?",
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
    text: "Can you get help or medicine within 3 days after a sexual assault? (To prevent HIV, STIs (Sexually Transmitted Infections), or pregnancy)",
    diseaseGroup: "community_wellbeing",
    maxScore: 1,
    options: [
      { label: "Yes", value: "yes", score: 0 },
      { label: "No", value: "no", score: 1 },
    ],
  },
  {
    id: "Q43",
    text: "Are warnings sent ahead of time before flooding occurs in your area?",
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
 * - Males skip Q22-Q36 entirely (gender-based, handled in wizard)
 * - Q1  = "No" (consent declined) → survey ends (handled in wizard UI)
 * - Q11 = "No symptom" → skip Q12, Q13 (no symptoms to describe)
 * - Q15 = "No" (no sexual partner) → skip Q16, Q19 (condom use & partner health)
 * - Q20 = "No" / "want_but_no_access" → skip Q21 (no method to specify)
 * - Q22 = "No" / "Not sure" → skip Q23, Q24, Q25, Q29, Q30 (current-pregnancy only)
 * - Q27 = "Never been pregnant" → skip Q28-Q33 (no pregnancy/delivery/miscarriage history)
 * - Q32 = "No" (no miscarriage) → skip Q33 (how many miscarriages)
 */
export interface SkipRule {
  questionId: string
  skipWhen: string[]
  skipTargets: string[]
}

export const SKIP_RULES: SkipRule[] = [
  {
    questionId: "Q11",
    skipWhen: ["none", "no_symptom"], // "none" = new checkbox value; "no_symptom" = legacy
    skipTargets: ["Q12", "Q13"],
  },
  {
    // No sexual partner → skip condom use and partner health questions
    questionId: "Q15",
    skipWhen: ["no"],
    skipTargets: ["Q16", "Q19"],
  },
  {
    // Not using prevention → skip "which method" question
    questionId: "Q20",
    skipWhen: ["no", "want_but_no_access"],
    skipTargets: ["Q21"],
  },
  {
    // Not pregnant → skip current-pregnancy-specific questions only
    // Q26-Q28 are about pregnancy history and still apply
    questionId: "Q22",
    skipWhen: ["no", "not_sure"],
    skipTargets: ["Q23", "Q24", "Q25", "Q29", "Q30"],
  },
  {
    // Never been pregnant → skip child spacing, delivery plan, previous deliveries, miscarriage questions
    questionId: "Q27",
    skipWhen: ["never_pregnant"],
    skipTargets: ["Q28", "Q29", "Q30", "Q31", "Q32", "Q33"],
  },
  {
    // No miscarriage → skip "how many miscarriages" question
    questionId: "Q32",
    skipWhen: ["no"],
    skipTargets: ["Q33"],
  },
]

export const MATERNAL_QUESTIONS = SCORED_QUESTIONS
  .filter((q) => q.diseaseGroup === "maternal_health")
  .map((q) => q.id)
