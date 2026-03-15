"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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

const ROLES = [
  "personal_user",
  "field_worker",
  "partner",
  "admin",
  "super_admin",
] as const

type UserRole = (typeof ROLES)[number]
type UserStatus = "active" | "inactive" | "suspended"

interface UserActionsProps {
  userId: string
  currentRole: string
  currentStatus: string
  updateRole: (userId: string, role: UserRole) => Promise<void>
  updateStatus: (userId: string, status: UserStatus) => Promise<void>
}

export function UserActions({
  userId,
  currentRole,
  currentStatus,
  updateRole,
  updateStatus,
}: UserActionsProps) {
  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)

  return (
    <menu className="flex items-center gap-2">
      <li>
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Edit Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Select a new role for this user.
              </DialogDescription>
            </DialogHeader>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button
                onClick={async () => {
                  await updateRole(userId, selectedRole as UserRole)
                  setRoleOpen(false)
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </li>
      <li>
        {currentStatus === "active" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatus(userId, "suspended")}
          >
            Suspend
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatus(userId, "active")}
          >
            Activate
          </Button>
        )}
      </li>
    </menu>
  )
}
