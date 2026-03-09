"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [step, setStep] = useState<"consent" | "details">("consent")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
    })

    if (authError) {
      setError(authError.message ?? "Registration failed.")
      setLoading(false)
      return
    }

    router.push("/personal/questionnaire")
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
                information is stored separately with AES-256 encryption and is
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
              I Understand &amp; Consent
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
                <Input id="name" name="name" required autoComplete="name" />
              </fieldset>
              <fieldset className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </fieldset>
              <fieldset className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </fieldset>
              {error && (
                <output className="block text-sm text-destructive">{error}</output>
              )}
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="register-form" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </section>
  )
}
