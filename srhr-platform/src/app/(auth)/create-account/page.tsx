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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

/** Format 10 raw digits as "803 456 7890" for display */
function formatNigerianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

/** Strip formatting, return raw 10 digits */
function stripPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10)
}

/** Validate: must be exactly 10 digits starting with valid NG prefix (7,8,9) */
function isValidNigerianPhone(digits: string): boolean {
  if (digits.length !== 10) return false
  return /^[789]\d{9}$/.test(digits)
}

export default function CreateAccountPage() {
  const [sex, setSex] = useState("")
  const [phoneDisplay, setPhoneDisplay] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = stripPhone(e.target.value)
    setPhoneDisplay(formatNigerianPhone(raw))
  }

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

    if (!sex) {
      setError("Please select your sex.")
      setLoading(false)
      return
    }

    // Validate phone if provided
    const rawPhone = stripPhone(phoneDisplay)
    if (rawPhone && !isValidNigerianPhone(rawPhone)) {
      setError("Please enter a valid 10-digit Nigerian mobile number (e.g. 803 456 7890).")
      setLoading(false)
      return
    }

    const homeAddress = (formData.get("homeAddress") as string).trim()

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
      sex,
      phone: rawPhone ? `+234${rawPhone}` : undefined,
      homeAddress: homeAddress || undefined,
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
            <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer">
              Open email app
            </a>
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
            <p className="text-xs text-muted-foreground">
              Enter your first and last name as they appear on official documents.
            </p>
            <Input
              id="name"
              name="name"
              type="text"
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
            <Label>Sex</Label>
            <RadioGroup
              value={sex}
              onValueChange={setSex}
              className="flex flex-row gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="sex-male" />
                <Label htmlFor="sex-male" className="font-normal cursor-pointer">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="sex-female" />
                <Label htmlFor="sex-female" className="font-normal cursor-pointer">Female</Label>
              </div>
            </RadioGroup>
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="phone">
              Mobile Number <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Enter your 10-digit number without +234 (e.g. 803 456 7890).
            </p>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                +234
              </span>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                value={phoneDisplay}
                onChange={handlePhoneChange}
                placeholder="803 456 7890"
                maxLength={12}
                autoComplete="tel-national"
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="homeAddress">
              Home Address <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="homeAddress"
              name="homeAddress"
              type="text"
              autoComplete="street-address"
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
            <p className="text-xs text-muted-foreground">
              Re-enter your password to confirm.
            </p>
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
  )
}
