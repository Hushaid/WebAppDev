"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth/client"
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

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const returnTo = searchParams.get("returnTo") || "/log-in"

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (resetError) {
      setError(resetError.message ?? "Failed to reset password. The link may have expired.")
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Please request a
            new one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`} className="w-full">
            <Button variant="outline" className="w-full">
              Request new reset link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Password Reset</CardTitle>
          <CardDescription>
            Your password has been successfully reset. You can now log in with
            your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={returnTo} className="w-full">
            <Button className="w-full">Back to log in</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below. It must be at least 8 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </fieldset>
          {error && (
            <output
              className="block rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </output>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          form="reset-password-form"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset password"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href={returnTo} className="text-primary underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
