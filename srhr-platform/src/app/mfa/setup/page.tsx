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

export default function MfaSetupPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<"intro" | "qr" | "verify">("intro")
  const [totpUri, setTotpUri] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleEnable() {
    setLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.enable({
        password: "", // Better Auth may handle this differently
      })

      if (result.data) {
        setTotpUri(result.data.totpURI ?? "")
        // Extract secret from the TOTP URI (otpauth://totp/...?secret=XXX&...)
        const uri = result.data.totpURI ?? ""
        const secretMatch = uri.match(/secret=([A-Z2-7]+)/i)
        setSecret(secretMatch?.[1] ?? "")
        setStep("qr")
      } else {
        setError("Failed to enable 2FA. Please try again.")
      }
    } catch {
      setError("Failed to enable 2FA. Please try again.")
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
          <Button onClick={handleEnable} disabled={loading} className="w-full">
            {loading ? "Setting up..." : "Set up 2FA"}
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
              <output className="mt-1 block rounded border bg-muted p-2 text-center font-mono text-sm tracking-widest">
                {secret}
              </output>
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
