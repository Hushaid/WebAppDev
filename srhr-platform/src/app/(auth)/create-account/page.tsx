"use client"

import { useState } from "react"
import Link from "next/link"
import { signUp } from "@/lib/auth/client"
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

export default function CreateAccountPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    const email = (formData.get("email") as string).trim().toLowerCase()
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (name.length < 2) {
      setError("Please enter your full name (at least 2 characters).")
      setLoading(false)
      return
    }

    if (name.length > 100) {
      setError("Name must be 100 characters or fewer.")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      setLoading(false)
      return
    }

    if (password.length > 128) {
      setError("Password must be 128 characters or fewer.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
    })

    if (authError) {
      setError(authError.message ?? "Could not create your account. Please try again.")
      setLoading(false)
      return
    }

    setSubmittedEmail(email)
    setVerificationSent(true)
    setLoading(false)
  }

  if (verificationSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription>
            We sent a verification link to{" "}
            <strong>{submittedEmail}</strong>. Please open the email and click the
            link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The link expires in 1 hour. If you do not see the email, check your
            spam or junk folder.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/log-in">Go to Log In</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>
          Sign up to take a confidential health assessment and get referrals to
          nearby health facilities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="create-account-form" onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your full name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              We will send a verification link to this address.
            </p>
          </fieldset>
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters.
            </p>
          </fieldset>
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "Hide password" : "Show password"}
              </button>
            </div>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </fieldset>
          {error && (
            <output className="block rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </output>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          form="create-account-form"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/log-in" className="text-primary underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
