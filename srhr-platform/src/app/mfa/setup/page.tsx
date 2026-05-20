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
}

export default function MfaSetupPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<"intro" | "qr" | "verify">("intro")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [totpUri, setTotpUri] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleEnable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.enable({
        password,
      })

      if (result.data) {
        setTotpUri(result.data.totpURI ?? "")
        const uri = result.data.totpURI ?? ""
        const secretMatch = uri.match(/secret=([A-Z2-7]+)/i)
        setSecret(secretMatch?.[1] ?? "")
        setStep("qr")
      } else {
        setError("Failed to enable 2FA. Please check your password and try again.")
      }
    } catch {
      setError("Failed to enable 2FA. Please check your password and try again.")
    } finally {
      setLoading(false)
    }
  }

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
      }
    } catch {
      setError("Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "intro") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication Required</CardTitle>
          <CardDescription>
            Your role requires two-factor authentication for extra security.
            You will need an authenticator app like Google Authenticator or
            Authy on your phone to complete this setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEnable} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mfa-password">Confirm your password</Label>
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
                id="mfa-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter your account password to enable two-factor authentication.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !password} className="w-full">
              {loading ? "Setting up..." : "Set up 2FA"}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  if (step === "qr") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Scan this QR code with your authenticator app, or enter the secret
            key manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totpUri && (
            <figure className="flex justify-center rounded-lg border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- External QR code API, unoptimizable */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                alt="TOTP QR Code"
                width={200}
                height={200}
              />
            </figure>
          )}

          {secret && (
            <div>
              <Label>Manual Entry Key</Label>
              <div className="mt-1 flex items-center gap-2 rounded border bg-muted p-2">
                <output className="min-w-0 flex-1 break-all font-mono text-xs tracking-widest">
                  {secret}
                </output>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(secret)
                  }}
                  aria-label="Copy secret key"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={() => setStep("verify")}
            className="w-full"
          >
            I&apos;ve scanned the code
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify 2FA Code</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app to complete setup.
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
            <Label htmlFor="totp-code">Verification Code</Label>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code shown in your authenticator app.
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
            {loading ? "Verifying..." : "Verify & enable 2FA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
