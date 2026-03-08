import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core"
import { climateValidationStatusEnum, riskLevelEnum } from "./enums"
import { users } from "./users"
import { geographicUnits } from "./facilities"

export const climateDatasets = pgTable("climate_datasets", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  validationStatus: climateValidationStatusEnum("validation_status")
    .notNull()
    .default("pending"),
  coverageArea: text("coverage_area"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const climateRisks = pgTable("climate_risks", {
  id: uuid("id").defaultRandom().primaryKey(),
  geographicUnitId: uuid("geographic_unit_id")
    .notNull()
    .references(() => geographicUnits.id),
  disasterType: text("disaster_type").notNull(),
  probability: numeric("probability"),
  severity: riskLevelEnum("severity"),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
