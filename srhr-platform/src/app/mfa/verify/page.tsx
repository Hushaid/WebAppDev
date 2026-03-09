"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  super_admin: "/admin",
  field_worker: "/field-worker",
  personal_user: "/personal/questionnaire",
  partner: "/partners",
  gis_analyst: "/partners",
}

export default function MfaVerifyPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleVerify() {
    setLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
      })

      if (result.data) {
        const role = (session?.user as Record<string, unknown>)?.role as string ?? "admin"
        router.push(roleRoutes[role] ?? "/admin")
      } else {
        setError("Invalid code. Please try again.")
        setCode("")
      }
    } catch {
      setError("Verification failed. Please try again.")
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Verification</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleVerify()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="totp-code">Authentication Code</Label>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center font-mono text-lg tracking-widest"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
