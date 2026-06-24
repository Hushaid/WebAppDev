"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PersonalChangePasswordForm() {
  const t = useTranslations("personal.changePassword")
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPending, startTransition] = useTransition()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(t("mismatchError"))
      return
    }

    if (newPassword.length < 8) {
      toast.error(t("tooShortError"))
      return
    }

    startTransition(async () => {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t("successMessage"))
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        router.refresh()
      } else {
        toast.error(result.error ?? t("failureMessage"))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="current-password">{t("currentPassword")}</Label>
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? t("hidePassword") : t("showPassword")}
              </button>
            </div>
            <Input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showNew ? t("hidePassword") : t("showPassword")}
              </button>
            </div>
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? t("hidePassword") : t("showPassword")}
              </button>
            </div>
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
