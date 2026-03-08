import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core"

export const healthFacilities = pgTable("health_facilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  ward: text("ward"),
  lga: text("lga"),
  gpsLat: numeric("gps_lat"),
  gpsLng: numeric("gps_lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const geographicUnits = pgTable("geographic_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  h3Index: text("h3_index"),
  parentId: uuid("parent_id"),
  population: integer("population"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
