import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core"
import { submitterTypeEnum, riskLevelEnum } from "./enums"
import { users } from "./users"
import { subjects } from "./subjects"
import { questionnaires, questions } from "./questionnaires"
import { geographicUnits } from "./facilities"

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").references(() => subjects.id),
  submitterId: uuid("submitter_id")
    .notNull()
    .references(() => users.id),
  submitterType: submitterTypeEnum("submitter_type").notNull(),
  questionnaireVersionId: uuid("questionnaire_version_id")
    .notNull()
    .references(() => questionnaires.id),
  geographicUnitId: uuid("geographic_unit_id").references(() => geographicUnits.id),
  gpsLat: numeric("gps_lat"),
  gpsLng: numeric("gps_lng"),
  clientSubmissionId: text("client_submission_id").unique(),
  flaggedForReview: boolean("flagged_for_review").default(false).notNull(),
  flaggedAt: timestamp("flagged_at", { withTimezone: true }),
  referred: boolean("referred").default(false).notNull(),
  referredAt: timestamp("referred_at", { withTimezone: true }),
  referralNote: text("referral_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const questionResponses = pgTable("question_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  responseValue: text("response_value").notNull(),
  score: integer("score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const riskClassifications = pgTable("risk_classifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  stiScore: integer("sti_score").notNull(),
  stiRiskLevel: riskLevelEnum("sti_risk_level").notNull(),
  maternalScore: integer("maternal_score"),
  maternalRiskLevel: riskLevelEnum("maternal_risk_level"),
  communityWellbeingScore: integer("community_wellbeing_score").notNull(),
  communityWellbeingRiskLevel: riskLevelEnum("community_wellbeing_risk_level").notNull(),
  overallRiskLevel: riskLevelEnum("overall_risk_level").notNull(),
  aggregateScore: integer("aggregate_score").notNull(),
  modelVersion: text("model_version").default("v1").notNull(),
  classifiedAt: timestamp("classified_at", { withTimezone: true }).defaultNow().notNull(),
})
