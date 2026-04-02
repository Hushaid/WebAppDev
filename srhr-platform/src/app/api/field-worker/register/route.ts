import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { accounts, fieldWorkerCodes, users } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { logAudit } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const codeId = typeof body.codeId === "string" ? body.codeId : ""

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: "Please enter your full name (at least 2 characters)." },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400 },
      )
    }

    if (!email || !codeId) {
      return NextResponse.json(
        { success: false, error: "Missing registration details." },
        { status: 400 },
      )
    }

    const [code] = await db
      .select()
      .from(fieldWorkerCodes)
      .where(
        and(
          eq(fieldWorkerCodes.id, codeId),
          eq(fieldWorkerCodes.used, false),
          eq(fieldWorkerCodes.revoked, false),
        ),
      )
      .limit(1)

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Access code is no longer valid." },
        { status: 409 },
      )
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 },
      )
    }

    const { hashPassword } = await import("better-auth/crypto")
    const hashedPassword = await hashPassword(password)
    const userId = crypto.randomUUID()

    await db.insert(users).values({
      id: userId,
      email,
      name,
      role: "field_worker",
      emailVerified: true,
      status: "active",
      mfaEnabled: false,
      failedLoginAttempts: 0,
    })

    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
    })

    await db
      .update(fieldWorkerCodes)
      .set({
        used: true,
        issuedTo: userId,
        usedAt: new Date(),
      })
      .where(eq(fieldWorkerCodes.id, codeId))

    logAudit({
      actorId: userId,
      action: "register",
      entityType: "user",
      entityId: userId,
      metadata: { role: "field_worker", accessCodeId: codeId },
    }).catch(console.error)

    return NextResponse.json({ success: true, userId })
  } catch {
    return NextResponse.json(
      { success: false, error: "Registration failed." },
      { status: 500 },
    )
  }
}
