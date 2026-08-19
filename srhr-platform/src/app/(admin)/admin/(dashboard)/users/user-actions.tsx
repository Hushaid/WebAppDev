"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  callerRole: string
  callerId: string
}

export function UserActions({
  userId,
  userName,
  currentRole,
  currentStatus,
  callerRole,
  callerId,
}: UserActionsProps) {
  const router = useRouter()
  const availableRoles = callerRole === "super_admin"
    ? ROLES
    : ROLES.filter((r) => r !== "super_admin")

  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)
  const [isRolePending, startRoleTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  const isSelf = callerId === userId
  const isSuperAdmin = callerRole === "super_admin"

  // Only super_admin can manage users
  const canEditRole = isSuperAdmin
  const canSuspend = isSuperAdmin && currentRole !== "super_admin"
  const canDelete = isSuperAdmin && !isSelf

  function handleSaveRole() {
    if (selectedRole === currentRole) {
      setRoleOpen(false)
      return
    }
    startRoleTransition(async () => {
      try {
        const result = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "role", role: selectedRole as UserRole }),
        }).then((response) => response.json())
        if (!result.success) {
          throw new Error(result.error ?? "Failed to update role")
        }
        toast.success(`Role updated to ${selectedRole.replace(/_/g, " ")}`, {
          description: userName,
        })
        setRoleOpen(false)
        router.refresh()
      } catch {
        toast.error("Failed to update role")
      }
    })
  }

  function handleToggleStatus() {
    const newStatus: UserStatus = currentStatus === "active" ? "suspended" : "active"
    startStatusTransition(async () => {
      try {
        const result = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "status", status: newStatus }),
        }).then((response) => response.json())
        if (!result.success) {
          throw new Error(result.error ?? "Failed to update status")
        }
        toast.success(
          newStatus === "suspended" ? "User suspended" : "User activated",
          { description: userName },
        )
        router.refresh()
      } catch {
        toast.error("Failed to update status")
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      }).then((response) => response.json())
      if (result.success) {
        toast.success("User deleted", { description: userName })
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete user")
      }
    })
  }

  return (
    <menu className="flex items-center gap-2">
      {canEditRole && (
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
                {availableRoles.map((role) => (
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
      )}
      {canSuspend && (
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
      )}
      {canDelete && (
        <li>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeletePending}>
                {isDeletePending ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete user?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{userName}</strong> and all their
                  data (sessions, login credentials, 2FA). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </li>
      )}
    </menu>
  )
}
