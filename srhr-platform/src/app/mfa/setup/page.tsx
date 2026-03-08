"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth/client"
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

export default function MfaSetupPage() {
  const router = useRouter()
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
        router.push("/admin")
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
            Your role requires two-factor authentication (2FA) for security.
            Set up 2FA using an authenticator app like Google Authenticator or
            Authy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleEnable} disabled={loading} className="w-full">
            {loading ? "Setting up..." : "Set Up 2FA"}
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
              {/* QR code rendered via a simple img tag using a QR API */}
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
            I&apos;ve Scanned the Code
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
          <div>
            <Label htmlFor="totp-code">Verification Code</Label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 text-center font-mono text-lg tracking-widest"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify & Enable 2FA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
