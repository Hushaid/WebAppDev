import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  communityId: uuid("community_id"),
  ageGroup: text("age_group"),
  sex: text("sex"),
  phoneEncrypted: text("phone_encrypted"),
  emailEncrypted: text("email_encrypted"),
  consentGiven: boolean("consent_given").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
