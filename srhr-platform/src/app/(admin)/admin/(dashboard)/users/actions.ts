"use server"

import { db } from "@/lib/db"
import {
  users,
  accounts,
  submissions,
  alerts,
  subjects,
  auditLog,
  climateDatasets,
  fieldWorkerCodes,
  geographicUnits,
} from "@/lib/db/schema"
import { eq, desc, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Resend } from "resend"
import { logAudit } from "@/lib/audit"

type UserRole =
  | "personal_user"
  | "field_worker"
  | "partner"
  | "admin"
  | "super_admin"

type UserStatus = "active" | "inactive" | "suspended"

const roleLoginPaths: Record<string, string> = {
  admin: "/admin/log-in",
  super_admin: "/admin/log-in",
  partner: "/partners/log-in",
  field_worker: "/field-worker/log-in",
  personal_user: "/log-in",
}

export async function getUsers() {
  return db.select().from(users).orderBy(desc(users.createdAt))
}

export async function getGeographicUnits() {
  return db
    .select({ id: geographicUnits.id, name: geographicUnits.name, level: geographicUnits.level })
    .from(geographicUnits)
    .orderBy(asc(geographicUnits.name))
}

export async function updateUserDetails(
  userId: string,
  data: { name: string; phone: string; alternatePhone: string; homeAddress: string; sex: string },
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string })?.role
  if (callerRole !== "super_admin") {
    return { success: false as const, error: "Only a super admin can edit user details." }
  }

  await db
    .update(users)
    .set({
      name: data.name || undefined,
      phone: data.phone || null,
      alternatePhone: data.alternatePhone || null,
      homeAddress: data.homeAddress || null,
      sex: data.sex || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  logAudit({
    actorId: session?.user?.id,
    action: "update",
    entityType: "user",
    entityId: userId,
    metadata: { fields: Object.keys(data) },
  }).catch(console.error)

  revalidatePath("/admin/users")
  return { success: true as const }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (callerRole !== "super_admin") {
    throw new Error("Only a super admin can change user roles.")
  }

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
  const callerRole = (session?.user as { role?: string })?.role
  if (callerRole !== "super_admin") {
    throw new Error("Only a super admin can change user status.")
  }

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
  if (callerRole !== "super_admin") {
    return { success: false as const, error: "Only a super admin can create users." }
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
          <a href="${loginUrl}" style="display: inline-block; background: #11973E; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
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

export async function deleteUser(userId: string) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  const callerRole = (session?.user as { role?: string } | undefined)?.role
  const callerId = session?.user?.id

  if (callerRole !== "super_admin") {
    return { success: false as const, error: "Only a super admin can delete users." }
  }

  if (callerId === userId) {
    return { success: false as const, error: "You cannot delete your own account." }
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!target) {
    return { success: false as const, error: "User not found." }
  }

  // 1. Delete records with NOT NULL FKs (cannot be nullified)
  await db.delete(alerts).where(eq(alerts.recipientId, userId))
  await db.delete(submissions).where(eq(submissions.submitterId, userId))
  await db.delete(fieldWorkerCodes).where(eq(fieldWorkerCodes.issuedBy, userId))

  // 2. Nullify nullable FKs so the rows are preserved but unlinking the user
  await db.update(subjects).set({ createdBy: null }).where(eq(subjects.createdBy, userId))
  await db.update(auditLog).set({ actorId: null }).where(eq(auditLog.actorId, userId))
  await db.update(climateDatasets).set({ uploadedBy: null }).where(eq(climateDatasets.uploadedBy, userId))
  await db.update(fieldWorkerCodes).set({ issuedTo: null }).where(eq(fieldWorkerCodes.issuedTo, userId))

  // 3. Delete user — sessions, accounts, twoFactors cascade automatically via FK
  await db.delete(users).where(eq(users.id, userId))

  logAudit({
    actorId: callerId,
    action: "delete",
    entityType: "user",
    entityId: userId,
    metadata: { deletedRole: target.role, deletedEmail: target.email },
  }).catch(console.error)

  revalidatePath("/admin/users")
  return { success: true as const }
}
