import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { alertTypeEnum, alertStatusEnum, riskLevelEnum } from "./enums"
import { users } from "./users"
import { geographicUnits } from "./facilities"

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: alertTypeEnum("type").notNull(),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id),
  geographicUnitId: uuid("geographic_unit_id").references(() => geographicUnits.id),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  status: alertStatusEnum("status").notNull().default("pending"),
  title: text("title").notNull(),
  message: text("message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  actionedAt: timestamp("actioned_at", { withTimezone: true }),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
