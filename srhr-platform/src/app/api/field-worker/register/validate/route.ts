import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawCode = typeof body.code === "string" ? body.code : ""
    const code = rawCode.toUpperCase().trim()

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "Access code is required." },
        { status: 400 },
      )
    }

    const [found] = await db
      .select({ id: fieldWorkerCodes.id })
      .from(fieldWorkerCodes)
      .where(
        and(
          eq(fieldWorkerCodes.codeValue, code),
          eq(fieldWorkerCodes.used, false),
          eq(fieldWorkerCodes.revoked, false),
        ),
      )
      .limit(1)

    if (!found) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired access code." },
        { status: 404 },
      )
    }

    return NextResponse.json({ valid: true, codeId: found.id })
  } catch {
    return NextResponse.json(
      { valid: false, error: "Failed to validate access code." },
      { status: 500 },
    )
  }
}
