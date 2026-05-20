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
  {
    id: "Q1",
    text: "This survey will help understand your healthcare needs and ensure your community has supplies like medicine, delivery packs, sanitary pads, contraceptives and free treatment during flooding. Your answers are private. Can we start?",
    type: "radio",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
    required: true,
  },
  { id: "Q2", text: "What is the name of your state and community?", type: "text" },
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
    text: "Where do you live?",
    type: "radio",
    options: [
      { label: "With family", value: "family" },
      { label: "Alone", value: "alone" },
      { label: "In a camp (IDP)", value: "idp_camp" },
      { label: "Other", value: "other" },
    ],
  },
  {
    id: "Q5",
    text: "What is your age group?",
    type: "radio",
    options: [
      { label: "15–24 years", value: "15_24" },
      { label: "25–34 years", value: "25_34" },
      { label: "35 years or older", value: "35_plus" },
    ],
  },
  { id: "Q6", text: "What is your occupation?", type: "text" },
  {
    id: "Q7",
    text: "What is your annual range of income?",
    type: "radio",
    options: [
      { label: "₦10,000 – ₦20,000", value: "10k_20k" },
      { label: "₦20,000 – ₦30,000", value: "20k_30k" },
      { label: "₦30,000 – ₦40,000", value: "30k_40k" },
      { label: "₦40,000 – ₦50,000", value: "40k_50k" },
    ],
  },
  {
    id: "Q8",
    text: "What type of living condition do you have?",
    type: "radio",
    options: [
      { label: "Hut", value: "hut" },
      { label: "Bungalow", value: "bungalow" },
      { label: "Homeless", value: "homeless" },
      { label: "IDP camp", value: "idp_camp" },
    ],
  },
  {
    id: "Q9",
    text: "What is your family size?",
    type: "radio",
    options: [
      { label: "2–4", value: "2_4" },
      { label: "5–7", value: "5_7" },
      { label: "8–10", value: "8_10" },
    ],
  },
  {
    id: "Q10",
    text: "Do you have any disability? If yes, please state.",
    type: "text",
  },
]

export const CLOSING_QUESTIONS: DemographicQuestion[] = [
  {
    id: "Q44",
    text: "Please provide your phone or WhatsApp number so that relief teams can reach you with supplies or emergency health support during the floods. (Optional)",
    type: "text",
  },
  {
    id: "Q45",
    text: "Is it okay to use your anonymous answers (no name) to tell relief teams to bring supplies and more doctors and nurses to your community before the floods?",
    type: "radio",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
]

/**
 * Post-survey feedback questions — asked after the main questionnaire
 * to gauge respondent satisfaction and gather improvement suggestions.
 */
export const POST_SURVEY_QUESTIONS: DemographicQuestion[] = [
  {
    id: "PS1",
    text: "How easy to understand were the questions asked?",
    type: "radio",
    options: [
      { label: "Not easy", value: "1" },
      { label: "Slightly easy", value: "2" },
      { label: "Fairly easy", value: "3" },
      { label: "Easy", value: "4" },
      { label: "Very easy", value: "5" },
    ],
  },
  {
    id: "PS2",
    text: "How well did the words used to describe specific illnesses, symptoms, or body parts match what people actually call them in this community?",
    type: "radio",
    options: [
      { label: "Not well at all", value: "1" },
      { label: "Slightly well", value: "2" },
      { label: "Fairly well", value: "3" },
      { label: "Well", value: "4" },
      { label: "Very well", value: "5" },
    ],
  },
  {
    id: "PS3",
    text: "How well did the questions asked in this survey (and the options provided) reflect the reality in the area and health problems that actually worry you, your family and the community as a whole, the most?",
    type: "radio",
    options: [
      { label: "Not well at all", value: "1" },
      { label: "Slightly well", value: "2" },
      { label: "Fairly well", value: "3" },
      { label: "Well", value: "4" },
      { label: "Very well", value: "5" },
    ],
  },
  {
    id: "PS4",
    text: "Do you have any other suggestions to make this survey better or capture the community's health reality more accurately?",
    type: "text",
  },
  {
    id: "PS5",
    text: "Are there any health issues or local context that this survey missed entirely?",
    type: "text",
  },
]
