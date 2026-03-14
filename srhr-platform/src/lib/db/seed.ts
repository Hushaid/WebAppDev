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
import { eq } from "drizzle-orm"
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

  // 2. Insert all scored questions (Q11-Q43) + demographic questions (Q1-Q10, Q44-Q45)
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
    // Scored questions from config
    ...SCORED_QUESTIONS.map((q, idx) => ({
      questionNumber: q.id,
      text: `${q.id} - ${q.diseaseGroup.replace("_", " ")} assessment`,
      type: "single_choice" as const,
      scoreWeight: q.maxScore,
      diseaseGroup: q.diseaseGroup as "sti" | "maternal_health" | "community_wellbeing",
      sortOrder: 11 + idx,
    })),
    // Unscored Q44-Q45
    { questionNumber: "Q44", text: "Additional information", type: "text" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 44 },
    { questionNumber: "Q45", text: "Consent confirmation", type: "yes_no" as const, scoreWeight: 0, diseaseGroup: null, sortOrder: 45 },
  ]

  let insertedCount = 0
  for (const q of allQuestions) {
    try {
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
        .onConflictDoNothing()
      insertedCount++
    } catch {
      // May already exist
    }
  }

  console.log(`Inserted ${insertedCount} questions`)
  console.log(`\nQuestionnaire ID: ${questionnaireId}`)
  console.log("Use this ID as QUESTIONNAIRE_V1_ID in your environment.")

  await client.end()
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
