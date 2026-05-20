"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface CodeActionsProps {
  codeId: string
  codeValue: string
  used: boolean
  revoked: boolean
}

export function CodeActions({ codeId, codeValue, used, revoked }: CodeActionsProps) {
  const router = useRouter()
  const [isRevokePending, startRevokeTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleRevoke() {
    startRevokeTransition(async () => {
      try {
        const result = await fetch(`/api/admin/access-codes/${codeId}`, {
          method: "PATCH",
        }).then((response) => response.json())
        if (!result.success) {
          throw new Error(result.error ?? "Failed to revoke access code")
        }
        toast.success("Access code revoked", { description: codeValue })
        router.refresh()
      } catch {
        toast.error("Failed to revoke access code")
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        const result = await fetch(`/api/admin/access-codes/${codeId}`, {
          method: "DELETE",
        }).then((response) => response.json())
        if (!result.success) {
          throw new Error(result.error ?? "Failed to delete access code")
        }
        toast.success("Access code deleted", { description: codeValue })
        router.refresh()
      } catch {
        toast.error("Failed to delete access code")
      }
    })
  }

  if (revoked) return null

  if (used) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isDeletePending}
      >
        {isDeletePending ? "Deleting..." : "Delete"}
      </Button>
    )
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleRevoke}
      disabled={isRevokePending}
    >
      {isRevokePending ? "Revoking..." : "Revoke"}
    </Button>
  )
}
