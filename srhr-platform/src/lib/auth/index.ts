import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

const resend = new Resend(process.env.RESEND_API_KEY)

const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"

export const auth = betterAuth({
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
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Reset your Hushaid password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Reset Your Password</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>We received a request to reset your password for your Hushaid account.</p>
            <a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
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
      await resend.emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Verify your Hushaid account",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Welcome to Hushaid</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>Thank you for creating an account on Hushaid. Please verify your email address to get started.</p>
            <a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
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
  plugins: [
    twoFactor({
      issuer: "Hushaid",
      totpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
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
