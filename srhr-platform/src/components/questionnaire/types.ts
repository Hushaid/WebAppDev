import type { RiskResult } from "@/lib/scoring/engine"

export type Sex = "male" | "female"
export type SubmitterType = "field_worker" | "personal_user"

export interface DemographicQuestion {
  id: string
  text: string
  type: "text" | "select" | "radio"
  options?: { label: string; value: string }[]
  required?: boolean
}

export interface QuestionnaireResponse {
  [questionId: string]: string
}

export interface QuestionnaireCompleteData {
  responses: QuestionnaireResponse
  riskResult: RiskResult
  sex: Sex
  submitterType: SubmitterType
}

export const DEMOGRAPHIC_QUESTIONS: DemographicQuestion[] = [
  { id: "Q1", text: "What is your full name?", type: "text" },
  {
    id: "Q2",
    text: "What is your age group?",
    type: "select",
    options: [
      { label: "Under 18", value: "under_18" },
      { label: "18-24", value: "18_24" },
      { label: "25-34", value: "25_34" },
      { label: "35-44", value: "35_44" },
      { label: "45-54", value: "45_54" },
      { label: "55+", value: "55_plus" },
    ],
  },
  {
    id: "Q3",
    text: "What is your sex?",
    type: "radio",
    options: [
      { label: "Male", value: "male" },
      { label: "Female", value: "female" },
    ],
    required: true,
  },
  {
    id: "Q4",
    text: "What is your marital status?",
    type: "select",
    options: [
      { label: "Single", value: "single" },
      { label: "Married", value: "married" },
      { label: "Divorced/Separated", value: "divorced" },
      { label: "Widowed", value: "widowed" },
    ],
  },
  { id: "Q5", text: "What is your community/ward?", type: "text" },
  { id: "Q6", text: "What local government area (LGA) do you live in?", type: "text" },
  { id: "Q7", text: "What state do you live in?", type: "text" },
  {
    id: "Q8",
    text: "What is your highest level of education?",
    type: "select",
    options: [
      { label: "None", value: "none" },
      { label: "Primary", value: "primary" },
      { label: "Secondary", value: "secondary" },
      { label: "Tertiary", value: "tertiary" },
    ],
  },
  {
    id: "Q9",
    text: "What is your occupation?",
    type: "text",
  },
  {
    id: "Q10",
    text: "How many people live in your household?",
    type: "select",
    options: [
      { label: "1-3", value: "1_3" },
      { label: "4-6", value: "4_6" },
      { label: "7-10", value: "7_10" },
      { label: "More than 10", value: "more_10" },
    ],
  },
]

export const CLOSING_QUESTIONS: DemographicQuestion[] = [
  {
    id: "Q44",
    text: "Would you like to be referred to a health facility?",
    type: "radio",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  {
    id: "Q45",
    text: "Any additional comments or concerns?",
    type: "text",
  },
]
