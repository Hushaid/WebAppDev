"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error",
  )
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No verification token found. Please check your email for the correct link.",
  )

  useEffect(() => {
    if (!token) return

    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token!)}`,
        )
        if (res.ok || res.redirected) {
          setStatus("success")
          toast.success("Email verified. Welcome!")
        } else {
          setStatus("error")
          setErrorMessage("This verification link has expired or is invalid. Please request a new one.")
        }
      } catch {
        setStatus("error")
        setErrorMessage("Something went wrong. Please try again or request a new verification email.")
      }
    }

    verify()
  }, [token])

  if (status === "verifying") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Verifying your email</CardTitle>
          <CardDescription>
            Please wait while we confirm your email address...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Email verified</CardTitle>
          <CardDescription>
            Your email address has been confirmed. You are now signed in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/personal">Continue to dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Verification failed</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResendVerification />
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild className="w-full">
          <Link href="/log-in">Back to log in</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function ResendVerification() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      })
    } catch {
      // Always show success to prevent email enumeration
    }
    setSent(true)
    setSending(false)
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account with that email exists, we have sent a new verification link.
      </p>
    )
  }

  return (
    <form onSubmit={handleResend} className="space-y-3">
      <label htmlFor="resend-email" className="text-sm font-medium">
        Email
      </label>
      <p className="text-xs text-muted-foreground">
        Enter your email to receive a new verification link.
      </p>
      <input
        id="resend-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <Button type="submit" size="sm" disabled={sending} className="w-full">
        {sending ? "Sending..." : "Resend verification email"}
      </Button>
    </form>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
