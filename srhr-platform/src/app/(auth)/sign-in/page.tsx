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

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
      const msg = authError.message ?? "Sign in failed."
      // Detect lockout from error message
      if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("too many")) {
        setError(
          "Account locked due to too many failed attempts. Please try again in 15 minutes.",
        )
      } else {
        setError(msg)
      }
      setLoading(false)
      return
    }

    // Role-based redirect via root page
    router.push("/")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="sign-in-form" onSubmit={handleSubmit} className="space-y-4">
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
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
          form="sign-in-form"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-primary underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
