"use server"

import { db } from "@/lib/db"
import { users, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Resend } from "resend"
import { logAudit } from "@/lib/audit"

type UserRole =
  | "personal_user"
  | "field_worker"
  | "partner"
  | "gis_analyst"
  | "admin"
  | "super_admin"

type UserStatus = "active" | "inactive" | "suspended"

const roleLoginPaths: Record<string, string> = {
  admin: "/admin/log-in",
  super_admin: "/admin/log-in",
  partner: "/partners/log-in",
  gis_analyst: "/partners/log-in",
  field_worker: "/field-worker/log-in",
  personal_user: "/log-in",
}

export async function getUsers() {
  return db.select().from(users).orderBy(users.createdAt)
}

export async function updateUserRole(userId: string, role: UserRole) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))

  logAudit({
    actorId: session?.user?.id,
    action: "update_role",
    entityType: "user",
    entityId: userId,
    metadata: { newRole: role },
  }).catch(console.error)

  revalidatePath("/admin/users")
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId))

  logAudit({
    actorId: session?.user?.id,
    action: "update_status",
    entityType: "user",
    entityId: userId,
    metadata: { newStatus: status },
  }).catch(console.error)

  revalidatePath("/admin/users")
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: UserRole
}) {
  // 1. Verify caller is admin/super_admin
  const headersList = await headers()
  const session = await auth.api.getSession({
    headers: headersList,
  })

  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (!callerRole || !["admin", "super_admin"].includes(callerRole)) {
    return { success: false as const, error: "Unauthorized." }
  }

  // 2. Check if user already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email.toLowerCase().trim()))
    .limit(1)

  if (existing) {
    return { success: false as const, error: "A user with this email already exists." }
  }

  // 3. Hash password and create user
  const { hashPassword } = await import("better-auth/crypto")
  const hashedPassword = await hashPassword(data.password)

  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    role: data.role,
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

  // 4. Send welcome email
  const resendKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const loginPath = roleLoginPaths[data.role] ?? "/log-in"
  const loginUrl = `${baseUrl}${loginPath}`

  if (resendKey) {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: emailFrom,
      to: data.email.toLowerCase().trim(),
      subject: "Welcome to Hushaid — Your account is ready",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Welcome to Hushaid</h2>
          <p>Hi ${data.name.trim()},</p>
          <p>An administrator has created a Hushaid account for you as a <strong>${data.role.replace(/_/g, " ")}</strong>.</p>
          <p><strong>Your login details:</strong></p>
          <ul>
            <li>Email: ${data.email}</li>
            <li>Temporary password: ${data.password}</li>
          </ul>
          <p>Please change your password after your first login.</p>
          <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Log In to Your Account
          </a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Hushaid &mdash; Confidential health assessments for Nigerian communities.</p>
        </div>
      `,
    })
  }

  logAudit({
    actorId: session?.user?.id,
    action: "create",
    entityType: "user",
    entityId: id,
    metadata: { role: data.role, email: data.email.toLowerCase().trim() },
  }).catch(console.error)

  revalidatePath("/admin/users")
  return { success: true as const }
}
