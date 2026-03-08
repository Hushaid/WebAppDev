import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core"
import {
  questionnaireStatusEnum,
  questionTypeEnum,
  diseaseGroupEnum,
} from "./enums"

export const questionnaires = pgTable("questionnaires", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: integer("version").notNull(),
  status: questionnaireStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionnaireId: uuid("questionnaire_id")
    .notNull()
    .references(() => questionnaires.id, { onDelete: "cascade" }),
  questionNumber: text("question_number").notNull(),
  text: text("text").notNull(),
  type: questionTypeEnum("type").notNull(),
  scoreWeight: integer("score_weight").default(0).notNull(),
  diseaseGroup: diseaseGroupEnum("disease_group"),
  conditionalLogic: jsonb("conditional_logic"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
