"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
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
  userName: string
  currentRole: string
  currentStatus: string
  updateRole: (userId: string, role: UserRole) => Promise<void>
  updateStatus: (userId: string, status: UserStatus) => Promise<void>
}

export function UserActions({
  userId,
  userName,
  currentRole,
  currentStatus,
  updateRole,
  updateStatus,
}: UserActionsProps) {
  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)
  const [isRolePending, startRoleTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()

  function handleSaveRole() {
    if (selectedRole === currentRole) {
      setRoleOpen(false)
      return
    }
    startRoleTransition(async () => {
      try {
        await updateRole(userId, selectedRole as UserRole)
        toast.success(`Role updated to ${selectedRole.replace(/_/g, " ")}`, {
          description: userName,
        })
        setRoleOpen(false)
      } catch {
        toast.error("Failed to update role")
      }
    })
  }

  function handleToggleStatus() {
    const newStatus: UserStatus = currentStatus === "active" ? "suspended" : "active"
    startStatusTransition(async () => {
      try {
        await updateStatus(userId, newStatus)
        toast.success(
          newStatus === "suspended" ? "User suspended" : "User activated",
          { description: userName },
        )
      } catch {
        toast.error("Failed to update status")
      }
    })
  }

  return (
    <menu className="flex items-center gap-2">
      <li>
        <Dialog open={roleOpen} onOpenChange={(open) => {
          setRoleOpen(open)
          if (open) setSelectedRole(currentRole)
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Edit Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Select a new role for {userName}.
              </DialogDescription>
            </DialogHeader>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRole} disabled={isRolePending}>
                {isRolePending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </li>
      <li>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleStatus}
          disabled={isStatusPending}
        >
          {currentStatus === "active" ? "Suspend" : "Activate"}
        </Button>
      </li>
    </menu>
  )
}
