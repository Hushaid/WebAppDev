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
import { validateAccessCode, redeemAccessCode } from "./actions"

export default function FieldWorkerRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<"code" | "details">("code")
  const [accessCode, setAccessCode] = useState("")
  const [codeId, setCodeId] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const { data, error: authError } = await signUp.email({
      name,
      email,
      password,
    })

    if (authError) {
      setError(authError.message ?? "Registration failed.")
      setLoading(false)
      return
    }

    // Redeem the access code for this user
    if (data?.user?.id) {
      await redeemAccessCode(codeId, data.user.id)
    }

    router.push("/field-worker/questionnaire")
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
                <Input
                  id="access-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="e.g. A1B2C3D4"
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
              {loading ? "Validating..." : "Verify Code"}
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
              {loading ? "Registering..." : "Register"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </section>
  )
}
