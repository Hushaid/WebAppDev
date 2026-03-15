"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createUser } from "./actions"

const BASE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "partner", label: "Partner" },
  { value: "field_worker", label: "Field Worker" },
] as const

const ALL_ROLES = [
  ...BASE_ROLES,
  { value: "super_admin", label: "Super Admin" },
] as const

type UserRole = "personal_user" | "field_worker" | "partner" | "admin" | "super_admin"

export function CreateUserDialog({ callerRole }: { callerRole: string }) {
  const CREATABLE_ROLES = callerRole === "super_admin" ? ALL_ROLES : BASE_ROLES
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>("partner")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string).trim()
    const email = (formData.get("email") as string).trim().toLowerCase()
    const password = formData.get("password") as string

    if (name.length < 2) {
      setError("Name must be at least 2 characters.")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      setLoading(false)
      return
    }

    const result = await createUser({ name, email, password, role })

    if (!result.success) {
      setError(result.error ?? "Failed to create user.")
      setLoading(false)
      return
    }

    setOpen(false)
    setError("")
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new account. The user will receive a welcome email with their
            login details.
          </DialogDescription>
        </DialogHeader>
        <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label htmlFor="cu-name">Full Name</Label>
            <Input
              id="cu-name"
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
            />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              name="email"
              type="email"
              required
              autoComplete="off"
            />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="cu-password">Temporary Password</Label>
            <Input
              id="cu-password"
              name="password"
              type="text"
              required
              minLength={8}
              maxLength={128}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              The user should change this after their first login.
            </p>
          </fieldset>
          <fieldset className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <DialogFooter>
          <Button
            type="submit"
            form="create-user-form"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
