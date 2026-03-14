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
import { SCORED_QUESTIONS } from "../scoring/questions-config"

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

  // 1. Upsert v1 questionnaire
  const [questionnaire] = await db
    .insert(questionnaires)
    .values({
      version: 1,
      status: "published",
      publishedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning()

  let questionnaireId: string

  if (questionnaire) {
    questionnaireId = questionnaire.id
    console.log(`Created questionnaire v1: ${questionnaireId}`)
  } else {
    // Already exists — fetch it
    const [existing] = await db
      .select()
      .from(questionnaires)
      .limit(1)
    questionnaireId = existing.id
    console.log(`Questionnaire v1 already exists: ${questionnaireId}`)
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

  const allQuestions = [
    // Demographic (unscored) Q1-Q10
    ...Array.from({ length: 10 }, (_, i) => ({
      questionNumber: `Q${i + 1}`,
      text: `Demographic question ${i + 1}`,
      type: "single_choice" as const,
      scoreWeight: 0,
      diseaseGroup: null,
      sortOrder: i + 1,
    })),
    // Scored questions from config with real question texts
    ...SCORED_QUESTIONS.map((q, idx) => ({
      questionNumber: q.id,
      text: questionTexts[q.id] ?? `${q.id} — Health assessment question`,
      type: "single_choice" as const,
      scoreWeight: q.maxScore,
      diseaseGroup: q.diseaseGroup as "sti" | "maternal_health" | "community_wellbeing",
      sortOrder: 11 + idx,
    })),
    // Unscored Q44-Q45
    { questionNumber: "Q44", text: "Is there anything else you would like to share about your health or your community's health?", type: "text" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 44 },
    { questionNumber: "Q45", text: "Do you confirm that you have answered these questions honestly and give consent for your anonymised responses to be used for community health assessment?", type: "yes_no" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 45 },
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
        // Update the text if it changed
        if (existing.text !== q.text) {
          await db
            .update(questions)
            .set({ text: q.text, updatedAt: new Date() })
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
