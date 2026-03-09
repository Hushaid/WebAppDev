"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

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
      setError(authError.message ?? "Create account failed. Please try again.")
      setLoading(false)
      return
    }

    router.push("/log-in")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>
          Create an account to access the SRHR platform.
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
              placeholder="Your name"
              required
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
          </fieldset>
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  aria-label="Show password"
                  className="size-3.5 rounded border-input"
                />
                Show password
              </label>
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </fieldset>
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={showConfirmPassword}
                  onChange={(e) => setShowConfirmPassword(e.target.checked)}
                  aria-label="Show confirm password"
                  className="size-3.5 rounded border-input"
                />
                Show password
              </label>
            </div>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
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
