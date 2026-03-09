"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Always show success to prevent email enumeration
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            If an account with that email exists, we&apos;ve sent password reset
            instructions to <strong>{email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/sign-in" className="w-full">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you instructions to reset
          your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </fieldset>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          form="forgot-password-form"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/sign-in" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
