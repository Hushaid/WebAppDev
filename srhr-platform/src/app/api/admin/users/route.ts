import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { accounts, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { Resend } from "resend"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

type UserRole = "personal_user" | "field_worker" | "partner" | "admin" | "super_admin"

const roleLoginPaths: Record<string, string> = {
  admin: "/admin/log-in",
  super_admin: "/admin/log-in",
  partner: "/partners/log-in",
  field_worker: "/field-worker/log-in",
  personal_user: "/log-in",
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (callerRole !== "super_admin") {
    return NextResponse.json({ success: false, error: "Only a super admin can create users." }, { status: 403 })
  }

  const body = await request.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const role = body.role as UserRole

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return NextResponse.json({ success: false, error: "A user with this email already exists." }, { status: 409 })
  }

  const { hashPassword } = await import("better-auth/crypto")
  const hashedPassword = await hashPassword(password)
  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    email,
    name,
    role,
    emailVerified: true,
    status: "active",
    mfaEnabled: false,
    failedLoginAttempts: 0,
  })
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: hashedPassword,
  })

  const resendKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const loginUrl = `${baseUrl}${roleLoginPaths[role] ?? "/log-in"}`
  if (resendKey) {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: "Welcome to Hushaid — Your account is ready",
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Welcome to Hushaid</h2>
          <p>Hi ${name},</p>
          <p>An administrator has created a Hushaid account for you as a <strong>${role.replace(/_/g, " ")}</strong>.</p>
          <p><strong>Your login details:</strong></p>
          <ul><li>Email: ${email}</li><li>Temporary password: ${password}</li></ul>
          <p>Please change your password after your first login.</p>
          <a href="${loginUrl}" style="display: inline-block; background: #11973E; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Log In to Your Account</a>
        </div>`,
    })
  }

  logAudit({ actorId: session?.user?.id, action: "create", entityType: "user", entityId: id, metadata: { role, email } }).catch(console.error)
  revalidatePath("/admin/users")
  return NextResponse.json({ success: true })
}

