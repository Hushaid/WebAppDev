/**
 * Database seed script — inserts the v1 questionnaire and all scored questions.
 *
 * Usage: bun run db:seed
 *
 * Env (from .env.local): DATABASE_URL, ADMIN_SEED_EMAIL (or ADMIN_EMAIL),
 * ADMIN_SEED_PASSWORD, ADMIN_SEED_NAME (or ADMIN_NAME)
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq, and } from "drizzle-orm"
import { questionnaires, questions, users, accounts } from "./schema"
import { SCORED_QUESTIONS, SKIP_RULES } from "../scoring/questions-config"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const client = postgres(DATABASE_URL)
const db = drizzle(client)

async function seedSuperAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL ?? process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_SEED_PASSWORD
  const name = process.env.ADMIN_SEED_NAME ?? process.env.ADMIN_NAME ?? "Super Admin"
  if (!email || !password) {
    console.warn("ADMIN_SEED_EMAIL (or ADMIN_EMAIL) and ADMIN_SEED_PASSWORD must be set — skipping super admin seed")
    return
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existing) {
    console.log("Super admin already exists — skipping")
    return
  }

  // Hash password using the same algo Better Auth uses
  const { hashPassword } = await import("better-auth/crypto")
  const hashedPassword = await hashPassword(password)

  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    email,
    name,
    role: "super_admin",
    emailVerified: true,
    status: "active",
    mfaEnabled: false,
    failedLoginAttempts: 0,
  })

  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: hashedPassword,
  })

  console.log(`Super admin seeded: ${name} (${email})`)
}

async function seed() {
  console.log("Seeding database...")

  // Seed super admin
  await seedSuperAdmin()

  // 1. Get or create v1 questionnaire
  let questionnaireId: string

  const [existing] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.version, 1))
    .limit(1)

  if (existing) {
    questionnaireId = existing.id
    console.log(`Questionnaire v1 already exists: ${questionnaireId}`)
  } else {
    const [created] = await db
      .insert(questionnaires)
      .values({
        version: 1,
        status: "published",
        publishedAt: new Date(),
      })
      .returning()
    questionnaireId = created.id
    console.log(`Created questionnaire v1: ${questionnaireId}`)
  }

  // 2. Real question texts from the Hushaid Risk Assessment Survey
  const questionTexts: Record<string, string> = {
    // === STI (Sexually Transmitted Infection) Risk Assessment (Q11-Q21) ===
    Q11: "Have you noticed any of these symptoms lately? (Unusual discharge or smell from private parts, sores or blisters, burning feeling when urinating, pain during sex, lower tummy pain, fever, yellow eyes/skin)",
    Q12: "How long have these symptoms been happening?",
    Q13: "Are the symptoms getting worse, staying the same, or improving?",
    Q14: "When was the last time you had a blood test for HIV or other infections?",
    Q15: "Have you had a sexual partner in the last one year?",
    Q16: "How often are you able to use a condom?",
    Q17: "Recently, has anyone forced or pressured you to have sex when you did not want to?",
    Q18: "Have you had to exchange sex for money, food, gifts, or a place to stay?",
    Q19: "Does your sexual partner have other partners, or any health problems you know about?",
    Q20: "Are you currently using any method to prevent STIs (Sexually Transmitted Infections) or pregnancy?",
    Q21: "Which prevention method are you using? (Condoms, pills, injection, implant, IUD/coil, natural method, herbs, or none)",

    // === Maternal Health Assessment (Q22-Q36, females only) ===
    Q22: "Are you currently pregnant?",
    Q23: "How many months pregnant are you?",
    Q24: "When was the last time you went for antenatal care (check-ups during pregnancy) during this pregnancy?",
    Q25: "What prevents you from attending antenatal care (pregnancy check-ups)?",
    Q26: "Have you experienced any of these in this pregnancy or past pregnancies? (Bad headaches, swelling in feet/hands/face, blurred vision, unusual bleeding, C-section, high blood pressure, high sugar level)",
    Q27: "How old were you when you had your first pregnancy?",
    Q28: "What is the time gap between each of your children?",
    Q29: "If pregnant now, where do you plan to deliver your baby?",
    Q30: "Are you preparing for delivery and do you have a delivery pack ready? (Soap, gloves, wrapper, baby clothes, cap, socks, towel, delivery pad)",
    Q31: "Where did you deliver your previous babies?",
    Q32: "Have you ever had a miscarriage (lost a pregnancy before the baby was born)?",
    Q33: "If yes, how many miscarriages have you had?",
    Q34: "Which groups face the greatest health risks related to sexual and reproductive health during flooding?",
    Q35: "During floods, which of the following is available in temporary shelters? (Safe delivery spaces, privacy for women, menstrual hygiene supplies, violence reporting)",
    Q36: "During flooding, are there reports of gender-based violence (GBV) in your community? (GBV means physical, sexual, or emotional harm based on someone's gender)",

    // === Community Health and Well-being (Q37-Q43) ===
    Q37: "Which of the following are available at the health centre in your community? (Sanitary pads, condoms, birth control, delivery pack, community health workers, trained nurses/doctors, private rooms)",
    Q38: "Is the health centre close enough for you to reach easily?",
    Q39: "During flooding, can you still get to the nearest health centre, or are the roads flooded?",
    Q40: "Were there medicines and drugs available during past floods?",
    Q41: "If you have children under 5 years old, have any of them missed their vaccinations recently due to flooding?",
    Q42: "Can you get help or medicine within 3 days after a sexual assault? (To prevent HIV, STIs, or pregnancy)",
    Q43: "Are warnings sent ahead of time before flooding occurs in your area?",
  }

  const demographicTexts: Record<string, string> = {
    Q1: "Consent — This survey will help understand your healthcare needs and ensure your community has supplies like medicine, delivery packs, sanitary pads, contraceptives and free treatment during flooding. Your answers are private. Can we start?",
    Q2: "What is the name of your state and community?",
    Q3: "What is your sex?",
    Q4: "Where do you live?",
    Q5: "What is your age group?",
    Q6: "What is your occupation?",
    Q7: "What is your annual range of income?",
    Q8: "What type of living condition do you have?",
    Q9: "What is your family size?",
    Q10: "Do you have any disability? If yes, please state.",
  }

  type DemographicOption = { label: string; value: string; score: number }
  const demographicOptions: Record<string, DemographicOption[]> = {
    Q1: [{ label: "Yes", value: "yes", score: 0 }, { label: "No", value: "no", score: 0 }],
    Q3: [{ label: "Male", value: "male", score: 0 }, { label: "Female", value: "female", score: 0 }],
    Q4: [
      { label: "With family", value: "family", score: 0 },
      { label: "Alone", value: "alone", score: 0 },
      { label: "In a camp (IDP)", value: "idp_camp", score: 0 },
      { label: "Other", value: "other", score: 0 },
    ],
    Q5: [
      { label: "15–24 years", value: "15_24", score: 0 },
      { label: "25–34 years", value: "25_34", score: 0 },
      { label: "35 years or older", value: "35_plus", score: 0 },
    ],
    Q7: [
      { label: "₦10,000 – ₦20,000", value: "10k_20k", score: 0 },
      { label: "₦20,000 – ₦30,000", value: "20k_30k", score: 0 },
      { label: "₦30,000 – ₦40,000", value: "30k_40k", score: 0 },
      { label: "₦40,000 – ₦50,000", value: "40k_50k", score: 0 },
    ],
    Q8: [
      { label: "Hut", value: "hut", score: 0 },
      { label: "Bungalow", value: "bungalow", score: 0 },
      { label: "Homeless", value: "homeless", score: 0 },
      { label: "IDP camp", value: "idp_camp", score: 0 },
    ],
    Q9: [
      { label: "2–4", value: "2_4", score: 0 },
      { label: "5–7", value: "5_7", score: 0 },
      { label: "8–10", value: "8_10", score: 0 },
    ],
  }
  const demographicTypes: Record<string, "single_choice" | "text"> = {
    Q2: "text", Q6: "text", Q10: "text",
  }

  const ratingOptions: DemographicOption[] = [
    { label: "Not well at all", value: "1", score: 0 },
    { label: "Slightly well", value: "2", score: 0 },
    { label: "Fairly well", value: "3", score: 0 },
    { label: "Well", value: "4", score: 0 },
    { label: "Very well", value: "5", score: 0 },
  ]
  const easeOptions: DemographicOption[] = [
    { label: "Not easy", value: "1", score: 0 },
    { label: "Slightly easy", value: "2", score: 0 },
    { label: "Fairly easy", value: "3", score: 0 },
    { label: "Easy", value: "4", score: 0 },
    { label: "Very easy", value: "5", score: 0 },
  ]

  const allQuestions = [
    // Demographic (unscored) Q1-Q10
    ...Array.from({ length: 10 }, (_, i) => {
      const qNum = `Q${i + 1}`
      return {
        questionNumber: qNum,
        text: demographicTexts[qNum] ?? `Demographic question ${i + 1}`,
        type: (demographicTypes[qNum] ?? "single_choice") as "single_choice" | "text",
        scoreWeight: 0,
        diseaseGroup: null,
        sortOrder: i + 1,
        ...(demographicOptions[qNum] ? { options: demographicOptions[qNum] } : {}),
      }
    }),
    // Scored questions from config with real question texts
    ...SCORED_QUESTIONS.map((q, idx) => {
      const skipRule = SKIP_RULES.find((r) => r.questionId === q.id)
      return {
        questionNumber: q.id,
        text: questionTexts[q.id] ?? q.text,
        type: (q.type === "checkbox" ? "multiple_choice" : "single_choice") as "single_choice" | "multiple_choice",
        scoreWeight: q.maxScore,
        diseaseGroup: q.diseaseGroup as "sti" | "maternal_health" | "community_wellbeing",
        options: q.options,
        conditionalLogic: skipRule
          ? { skipWhen: skipRule.skipWhen, skipTargets: skipRule.skipTargets }
          : null,
        sortOrder: 11 + idx,
      }
    }),
    // Unscored Q44-Q45
    { questionNumber: "Q44", text: "Please provide your phone or WhatsApp number so that relief teams can reach you with supplies or emergency health support during the floods.", type: "text" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 44 },
    { questionNumber: "Q45", text: "Is it okay to use your anonymous answers (no name) to tell relief teams to bring supplies and more doctors and nurses to your community before the floods?", type: "yes_no" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 45, options: [{ label: "Yes", value: "yes", score: 0 }, { label: "No", value: "no", score: 0 }] },
    // Post-survey feedback PS1-PS5
    { questionNumber: "PS1", text: "How easy to understand were the questions asked?", type: "single_choice" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 46, options: easeOptions },
    { questionNumber: "PS2", text: "How well did the words used to describe specific illnesses, symptoms, or body parts match what people actually call them in this community?", type: "single_choice" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 47, options: ratingOptions },
    { questionNumber: "PS3", text: "How well did the questions asked in this survey (and the options provided) reflect the reality in the area and health problems that actually worry you, your family and the community as a whole, the most?", type: "single_choice" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 48, options: ratingOptions },
    { questionNumber: "PS4", text: "Do you have any other suggestions to make this survey better or capture the community's health reality more accurately?", type: "text" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 49 },
    { questionNumber: "PS5", text: "Are there any health issues or local context that this survey missed entirely?", type: "text" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 50 },
  ]

  let insertedCount = 0
  let updatedCount = 0
  for (const q of allQuestions) {
    try {
      // Check if question already exists
      const [existing] = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.questionnaireId, questionnaireId),
            eq(questions.questionNumber, q.questionNumber),
          ),
        )
        .limit(1)

      if (existing) {
        // Update text, type, options, and conditionalLogic
        const updates: Record<string, unknown> = {}
        if (existing.text !== q.text) updates.text = q.text
        if (existing.type !== q.type) updates.type = q.type
        if ("options" in q && q.options) updates.options = q.options
        if ("conditionalLogic" in q) updates.conditionalLogic = q.conditionalLogic
        if (Object.keys(updates).length > 0) {
          await db
            .update(questions)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(questions.id, existing.id))
          updatedCount++
        }
      } else {
        await db
          .insert(questions)
          .values({
            questionnaireId,
            questionNumber: q.questionNumber,
            text: q.text,
            type: q.type,
            scoreWeight: q.scoreWeight,
            diseaseGroup: q.diseaseGroup,
            options: "options" in q ? q.options : undefined,
            conditionalLogic: "conditionalLogic" in q ? q.conditionalLogic : undefined,
            sortOrder: q.sortOrder,
          })
        insertedCount++
      }
    } catch {
      // May fail for other reasons
    }
  }

  console.log(`Inserted ${insertedCount} questions, updated ${updatedCount} question texts`)
  console.log(`\nQuestionnaire ID: ${questionnaireId}`)
  console.log("Use this ID as QUESTIONNAIRE_V1_ID in your environment.")

  await client.end()
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
