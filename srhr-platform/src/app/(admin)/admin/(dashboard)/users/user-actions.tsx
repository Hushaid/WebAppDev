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

/** Roles that a plain admin cannot delete */
const PROTECTED_ROLES = ["admin", "super_admin"]

interface UserActionsProps {
  userId: string
  userName: string
  currentRole: string
  currentStatus: string
  callerRole: string
  callerId: string
  updateRole: (userId: string, role: UserRole) => Promise<void>
  updateStatus: (userId: string, status: UserStatus) => Promise<void>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>
}

export function UserActions({
  userId,
  userName,
  currentRole,
  currentStatus,
  callerRole,
  callerId,
  updateRole,
  updateStatus,
  deleteUser,
}: UserActionsProps) {
  const availableRoles = callerRole === "super_admin"
    ? ROLES
    : ROLES.filter((r) => r !== "super_admin")

  const [roleOpen, setRoleOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)
  const [isRolePending, startRoleTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  const isSelf = callerId === userId

  // super_admin accounts cannot be suspended (only deleted by super_admin)
  const canSuspend = currentRole !== "super_admin"

  // Determine if the current caller can delete this user:
  // - Can't delete yourself
  // - admin cannot delete admin/super_admin rows
  const canDelete =
    !isSelf &&
    (callerRole === "super_admin" ||
      (callerRole === "admin" && !PROTECTED_ROLES.includes(currentRole)))

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

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteUser(userId)
      if (result.success) {
        toast.success("User deleted", { description: userName })
      } else {
        toast.error(result.error ?? "Failed to delete user")
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
