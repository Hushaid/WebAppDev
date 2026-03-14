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
import { validateAccessCode, registerFieldWorker } from "./actions"

export default function FieldWorkerRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<"code" | "details">("code")
  const [accessCode, setAccessCode] = useState("")
  const [codeId, setCodeId] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await validateAccessCode(accessCode)

    if (!result.valid) {
      setError(result.error ?? "Invalid code.")
      setLoading(false)
      return
    }

    setCodeId(result.codeId!)
    setStep("details")
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    const email = (formData.get("email") as string).trim().toLowerCase()
    const password = formData.get("password") as string

    if (name.length < 2) {
      setError("Please enter your full name (at least 2 characters).")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      setLoading(false)
      return
    }

    const result = await registerFieldWorker({ name, email, password, codeId })

    if (!result.success) {
      setError(result.error ?? "Registration failed.")
      setLoading(false)
      return
    }

    // Field workers are auto-verified (access code proves legitimacy)
    // Redirect to login so they can sign in with their new credentials
    router.push("/field-worker/log-in?registered=true")
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Field Worker Registration</h1>
        <p className="text-muted-foreground">
          Enter your access code to register as a field worker.
        </p>
      </header>

      {step === "code" && (
        <Card>
          <CardHeader>
            <CardTitle>Access Code</CardTitle>
            <CardDescription>
              Enter the code provided by your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="code-form" onSubmit={handleCodeSubmit} className="space-y-4">
              <fieldset className="space-y-2">
                <Label htmlFor="access-code">Code</Label>
                <p className="text-xs text-muted-foreground">
                  Enter the 8-character code your administrator gave you.
                </p>
                <Input
                  id="access-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="font-mono tracking-widest uppercase"
                  required
                  maxLength={8}
                />
              </fieldset>
              {error && (
                <output className="block text-sm text-destructive">{error}</output>
              )}
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="code-form" className="w-full" disabled={loading}>
              {loading ? "Validating..." : "Verify code"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Code verified. Complete your registration below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="register-form" onSubmit={handleRegister} className="space-y-4">
              <fieldset className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <p className="text-xs text-muted-foreground">
                  Enter your first and last name.
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
                  You will use this email to log in.
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
              {error && (
                <output className="block text-sm text-destructive">{error}</output>
              )}
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="register-form" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </section>
  )
}
