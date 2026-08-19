import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const submitterId = request.nextUrl.searchParams.get("submitterId")

  if (!submitterId) {
    return NextResponse.json(
      { error: "submitterId is required" },
      { status: 400 },
    )
  }

  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.submitterId, submitterId))
    .orderBy(desc(submissions.createdAt))

  return NextResponse.json(rows)
}
