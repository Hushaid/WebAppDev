import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core"
import { riskLevelEnum } from "./enums"
import { geographicUnits } from "./facilities"

export const irixScores = pgTable("irix_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  geographicUnitId: uuid("geographic_unit_id")
    .notNull()
    .references(() => geographicUnits.id),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  modelVersion: text("model_version").notNull(),
  stiAvgScore: numeric("sti_avg_score"),
  stiRiskLevel: riskLevelEnum("sti_risk_level"),
  maternalAvgScore: numeric("maternal_avg_score"),
  maternalRiskLevel: riskLevelEnum("maternal_risk_level"),
  communityWellbeingAvgScore: numeric("community_wellbeing_avg_score"),
  communityWellbeingRiskLevel: riskLevelEnum("community_wellbeing_risk_level"),
  overallIrixScore: numeric("overall_irix_score").notNull(),
  overallRiskLevel: riskLevelEnum("overall_risk_level").notNull(),
  submissionCount: integer("submission_count").default(0).notNull(),
  hotspotFlag: boolean("hotspot_flag").default(false).notNull(),
  confidenceLower: numeric("confidence_lower"),
  confidenceUpper: numeric("confidence_upper"),
  filtersApplied: jsonb("filters_applied"),
})

export const irixTrends = pgTable("irix_trends", {
  id: uuid("id").defaultRandom().primaryKey(),
  geographicUnitId: uuid("geographic_unit_id")
    .notNull()
    .references(() => geographicUnits.id),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  stiAvgScore: numeric("sti_avg_score"),
  maternalAvgScore: numeric("maternal_avg_score"),
  communityWellbeingAvgScore: numeric("community_wellbeing_avg_score"),
  overallIrixScore: numeric("overall_irix_score").notNull(),
  overallRiskLevel: riskLevelEnum("overall_risk_level").notNull(),
  submissionCount: integer("submission_count").default(0).notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
})
