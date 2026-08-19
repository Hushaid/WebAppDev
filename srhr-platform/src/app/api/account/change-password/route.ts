import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 })
  }

  const body = await request.json()
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""

  const { verifyPassword, hashPassword } = await import("better-auth/crypto")
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")))
    .limit(1)

  if (!account?.password) {
    return NextResponse.json({ success: false, error: "No password set for this account." }, { status: 400 })
  }

  const valid = await verifyPassword({ hash: account.password, password: currentPassword })
  if (!valid) {
    return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, error: "New password must be at least 8 characters." }, { status: 400 })
  }

  const hashedPassword = await hashPassword(newPassword)
  await db.update(accounts).set({ password: hashedPassword }).where(eq(accounts.id, account.id))
  logAudit({ actorId: session.user.id, action: "change_password", entityType: "user", entityId: session.user.id }).catch(console.error)

  return NextResponse.json({ success: true })
}

