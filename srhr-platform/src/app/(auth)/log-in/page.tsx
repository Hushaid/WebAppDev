"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "@/lib/auth/client"
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

export default function LogInPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const { error: authError } = await signIn.email({
      email,
      password,
    })

    if (authError) {
      const msg = authError.message ?? "Log in failed."
      if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("too many")) {
        setError(
          "Your account has been temporarily locked due to too many failed attempts. Please try again in 15 minutes.",
        )
      } else if (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("email_not_verified")) {
        setError(
          "Please verify your email address before logging in. Check your inbox for a verification link.",
        )
      } else {
        setError(msg)
      }
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Log In</CardTitle>
        <CardDescription>
          Sign in to your Hushaid account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="log-in-form" onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
            />
            <Link
              href="/forgot-password"
              className="inline-block text-xs text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
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
          form="log-in-form"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log In"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/create-account" className="text-primary underline">
            Create account
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
