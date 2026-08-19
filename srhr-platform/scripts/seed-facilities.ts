import { config } from "dotenv"
config({ path: ".env.local" })

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { healthFacilities } from "../src/lib/db/schema"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const client = postgres(DATABASE_URL)
const db = drizzle(client)

const facilities = [
  { name: "PHC Karu", type: "Primary Health Centre", ward: "Karu", lga: "Karu", gpsLat: "9.0094", gpsLng: "7.6615" },
  { name: "PHC Gitata", type: "Primary Health Centre", ward: "Gitata", lga: "Karu", gpsLat: "9.2745", gpsLng: "7.9038" },
  { name: "PHC Panda-Kare", type: "Primary Health Centre", ward: "Panda/Kare", lga: "Karu", gpsLat: "9.2624", gpsLng: "7.8385" },
  { name: "PHC Tattara/Kondoro", type: "Primary Health Centre", ward: "Tattara/Kondoro", lga: "Karu", gpsLat: "9.205", gpsLng: "7.85" },
  { name: "PHC Keffin Shanu", type: "Primary Health Centre", ward: "Keffin Shanu", lga: "Karu", gpsLat: "9.045", gpsLng: "7.7" },
  { name: "PHC Gora (Uke)", type: "Primary Health Centre", ward: "Uke", lga: "Karu", gpsLat: "8.9172", gpsLng: "7.6975" },
  { name: "PHC Asokodape", type: "Primary Health Centre", ward: "Aso/Kodape", lga: "Karu", gpsLat: "9.06", gpsLng: "7.69" },
  { name: "PHC Karshi I", type: "Primary Health Centre", ward: "Karshi", lga: "Karu", gpsLat: "9.03", gpsLng: "7.82" },
  { name: "PHC Karshi II", type: "Primary Health Centre", ward: "Karshi", lga: "Karu", gpsLat: "9.035", gpsLng: "7.825" },
  { name: "PHC Gurku Kabusu", type: "Primary Health Centre", ward: "Gurku/Kabusu", lga: "Karu", gpsLat: "9.02", gpsLng: "7.65" },
  { name: "PHC Bagaji-Agada", type: "Primary Health Centre", ward: "Agada/Bagaji", lga: "Karu", gpsLat: "9.21", gpsLng: "7.76" },
  { name: "General Hospital Uke", type: "General Hospital", ward: "Uke", lga: "Karu", gpsLat: "8.92", gpsLng: "7.695" },
  { name: "Mararaba Medical Centre", type: "Secondary Facility", ward: "Gurku/Kabusu", lga: "Karu", gpsLat: "9.04", gpsLng: "7.63" },
  { name: "PHC Saka", type: "Primary Health Centre", ward: "Uke", lga: "Karu", gpsLat: "8.93", gpsLng: "7.71" },
  { name: "PHC Rugan Juli", type: "Primary Health Centre", ward: "Karu", lga: "Karu", gpsLat: "9.015", gpsLng: "7.67" },
]

async function seed() {
  console.log("Seeding health facilities...")

  for (const facility of facilities) {
    await db
      .insert(healthFacilities)
      .values(facility)
      .onConflictDoNothing()
  }

  console.log(`Seeded ${facilities.length} health facilities.`)
  await client.end()
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
