"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ChangePasswordForm() {
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
      toast.error("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
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
        toast.success("Password changed successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to change password")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your account password. You will need to enter your current password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="current-password">Current password</Label>
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? "Hide password" : "Show password"}
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
              <Label htmlFor="new-password">New password</Label>
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showNew ? "Hide password" : "Show password"}
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
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? "Hide password" : "Show password"}
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
            {isPending ? "Changing..." : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
