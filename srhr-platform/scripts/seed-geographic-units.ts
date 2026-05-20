/**
 * Seeds geographic_units with Nasarawa State and all 13 LGAs,
 * plus the 10 wards of Karu LGA (the primary data collection area).
 *
 * Safe to re-run — upserts by name + level.
 *
 * Usage:
 *   DATABASE_URL="..." bun run scripts/seed-geographic-units.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { geographicUnits } from "../src/lib/db/schema/facilities"
import { eq, and } from "drizzle-orm"

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

const NASARAWA_LGAS = [
  "Akwanga",
  "Awe",
  "Doma",
  "Karu",
  "Keana",
  "Keffi",
  "Kokona",
  "Lafia",
  "Nasarawa",
  "Nasarawa Egon",
  "Obi",
  "Toto",
  "Wamba",
]

const KARU_WARDS = [
  "Adu",
  "Gitata",
  "Jikwoyi",
  "Karu",
  "Mararaba",
  "New Nyanya",
  "Nyanya",
  "Orozo",
  "Panda",
  "Tammachi",
]

async function upsertUnit(
  name: string,
  level: string,
  parentId: string | null = null,
): Promise<string> {
  const conditions = parentId
    ? and(eq(geographicUnits.name, name), eq(geographicUnits.level, level))
    : and(eq(geographicUnits.name, name), eq(geographicUnits.level, level))

  const [existing] = await db
    .select({ id: geographicUnits.id })
    .from(geographicUnits)
    .where(conditions)
    .limit(1)

  if (existing) return existing.id

  const [inserted] = await db
    .insert(geographicUnits)
    .values({ name, level, parentId })
    .returning({ id: geographicUnits.id })

  return inserted.id
}

async function main() {
  console.log("Seeding geographic units for Nasarawa State...")

  // State
  const stateId = await upsertUnit("Nasarawa", "state")
  console.log(`  State: Nasarawa (${stateId})`)

  // LGAs
  const lgaIds: Record<string, string> = {}
  for (const lga of NASARAWA_LGAS) {
    lgaIds[lga] = await upsertUnit(lga, "lga", stateId)
    console.log(`  LGA: ${lga}`)
  }

  // Wards of Karu LGA
  const karuId = lgaIds["Karu"]
  for (const ward of KARU_WARDS) {
    await upsertUnit(ward, "ward", karuId)
    console.log(`    Ward: ${ward} (Karu LGA)`)
  }

  console.log(`\nDone. Seeded 1 state, ${NASARAWA_LGAS.length} LGAs, ${KARU_WARDS.length} wards.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
