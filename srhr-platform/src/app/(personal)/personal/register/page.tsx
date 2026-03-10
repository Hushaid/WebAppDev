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
import { signUp } from "@/lib/auth/client"

export default function PersonalRegisterPage() {
  const [step, setStep] = useState<"consent" | "details" | "verification">("consent")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
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
    setStep("verification")
    setLoading(false)
  }

  if (step === "verification") {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Personal Registration</h1>
          <p className="text-muted-foreground">
            Create your account to take a personal health assessment.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We sent a verification link to{" "}
              <strong>{submittedEmail}</strong>. Please open the email and click
              the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The link expires in 1 hour. If you do not see the email, check
              your spam or junk folder.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/log-in">Go to log in</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Personal Registration</h1>
        <p className="text-muted-foreground">
          Create your account to take a personal health assessment.
        </p>
      </header>

      {step === "consent" && (
        <Card>
          <CardHeader>
            <CardTitle>Consent &amp; Privacy</CardTitle>
            <CardDescription>
              Please review before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <article>
              <h3 className="font-medium">What this assessment covers</h3>
              <p className="text-muted-foreground">
                This questionnaire assesses your sexual and reproductive health
                risks across three areas: infection risk, maternal health, and
                Community Well-being.
              </p>
            </article>
            <article>
              <h3 className="font-medium">How your data is used</h3>
              <p className="text-muted-foreground">
                Your responses are anonymised and encrypted. Personal contact
                information is stored separately with strong encryption and is
                only accessible to authorised administrators.
              </p>
            </article>
            <article>
              <h3 className="font-medium">Your rights</h3>
              <p className="text-muted-foreground">
                You can stop the assessment at any time. Your de-identified data
                contributes to community-level health insights that help improve
                healthcare in your area.
              </p>
            </article>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => setStep("details")}>
              I understand &amp; consent
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to the collection and anonymised use of your
              health assessment data.
            </p>
          </CardFooter>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Enter your details to begin the assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="register-form" onSubmit={handleRegister} className="space-y-4">
              <fieldset className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <p className="text-xs text-muted-foreground">
                  Enter your first and last name as they appear on official documents.
                </p>
                <Input
                  id="name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </fieldset>
              <fieldset className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <p className="text-xs text-muted-foreground">
                  We will send a verification link to this address.
                </p>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
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
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters.
                </p>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
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
                <p className="text-xs text-muted-foreground">
                  Re-enter your password to confirm.
                </p>
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
            <Button type="submit" form="register-form" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/log-in" className="text-primary underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      )}
    </section>
  )
}
