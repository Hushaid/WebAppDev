import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { auditLog } from "@/lib/db/schema"

// Lazily instantiate Resend to avoid build-time errors when RESEND_API_KEY is not set
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"

const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"

const staticOrigins = [
  baseUrl,
  "http://srhr.localhost",
  "http://srhr.localhost:80",
  "http://srhr.localhost:1355",
  "http://localhost:3000",
  "http://localhost:1355",
].filter((origin, i, arr) => origin && arr.indexOf(origin) === i)

async function getTrustedOrigins(request?: Request) {
  const origins = [...staticOrigins]
  if (!request) return origins
  try {
    const origin = request.headers.get("origin") || request.headers.get("referer")
    if (origin) {
      const url = new URL(origin)
      const o = url.origin
      if (
        (o.startsWith("http://srhr.localhost") || o.startsWith("http://localhost")) &&
        !origins.includes(o)
      ) {
        origins.push(o)
      }
    }
  } catch {
    // ignore invalid URLs
  }
  return origins
}

function capitalizeWords(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const auth = betterAuth({
  trustedOrigins: getTrustedOrigins,
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    onExistingUserSignUp: async ({ user }) => {
      const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      await getResend().emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Sign-up attempt on your Hushaid account",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Someone tried to create an account with your email</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>We received a sign-up request using your email address (<strong>${user.email}</strong>), but you already have a Hushaid account.</p>
            <p>If this was you, you can log in to your existing account:</p>
            <a href="${baseUrl}/log-in" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
              Log In to Your Account
            </a>
            <p>Forgot your password? <a href="${baseUrl}/forgot-password" style="color: #2563eb;">Reset it here</a>.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't attempt to sign up, you can safely ignore this email. Your account is secure.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">Hushaid &mdash; Confidential health assessments for Nigerian communities.</p>
          </div>
        `,
      })
    },
    sendResetPassword: async ({ user, url }) => {
      // Derive role-specific login URL for after password reset
      const role = (user as Record<string, unknown>).role as string | undefined
      const loginPathMap: Record<string, string> = {
        admin: "/admin/log-in",
        super_admin: "/admin/log-in",
        field_worker: "/field-worker/log-in",
        partner: "/partners/log-in",
        gis_analyst: "/partners/log-in",
      }
      const loginPath = loginPathMap[role ?? ""] ?? "/log-in"

      // Encode returnTo into the callbackURL so it survives Better Auth's redirect
      const resetUrl = new URL(url)
      const existingCallback = resetUrl.searchParams.get("callbackURL") || "/reset-password"
      const callbackWithReturn = `${existingCallback}${existingCallback.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(loginPath)}`
      resetUrl.searchParams.set("callbackURL", callbackWithReturn)

      await getResend().emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Reset your Hushaid password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Reset Your Password</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>We received a request to reset your password for your Hushaid account.</p>
            <a href="${resetUrl.toString()}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
              Reset Password
            </a>
            <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">Hushaid &mdash; Confidential health assessments for Nigerian communities.</p>
          </div>
        `,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Extract token from the API URL and build a link to our verify-email page
      const parsedUrl = new URL(url)
      const token = parsedUrl.searchParams.get("token") ?? ""
      const verifyPageUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`

      await getResend().emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Verify your Hushaid account",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Welcome to Hushaid</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>Thank you for creating an account on Hushaid. Please verify your email address to get started.</p>
            <a href="${verifyPageUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
              Verify Email Address
            </a>
            <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour. If you didn't create this account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">Hushaid &mdash; Confidential health assessments for Nigerian communities.</p>
          </div>
        `,
      })
    },
  },
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          return {
            data: {
              ...user,
              name: user.name ? capitalizeWords(user.name) : user.name,
            },
          }
        },
        async after(user) {
          db.insert(auditLog).values({
            actorId: user.id,
            action: "register",
            entityType: "user",
            entityId: user.id,
            metadata: { method: "email" },
          }).catch(console.error)
        },
      },
      update: {
        async before(user) {
          return {
            data: {
              ...user,
              ...(user.name ? { name: capitalizeWords(user.name) } : {}),
            },
          }
        },
      },
    },
    session: {
      create: {
        async after(session) {
          db.insert(auditLog).values({
            actorId: session.userId,
            action: "login",
            entityType: "session",
            entityId: session.id,
            ipAddress: session.ipAddress ?? undefined,
            metadata: { userAgent: session.userAgent ?? null },
          }).catch(console.error)
        },
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: "Hushaid",
      totpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],
  rateLimit: {
    window: 60,
    max: 10,
  },
  session: {
    expiresIn: 60 * 30, // 30 minutes — session expires after 30 min of inactivity
    updateAge: 60 * 5, // 5 minutes — refresh session on activity
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "personal_user",
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "active",
        input: false,
      },
      mfaEnabled: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      failedLoginAttempts: {
        type: "number",
        required: true,
        defaultValue: 0,
        input: false,
      },
      lockedUntil: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
