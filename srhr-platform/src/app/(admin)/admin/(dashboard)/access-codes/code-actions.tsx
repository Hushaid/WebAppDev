"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { revokeAccessCode, deleteAccessCode } from "./actions"

interface CodeActionsProps {
  codeId: string
  codeValue: string
  used: boolean
  revoked: boolean
}

export function CodeActions({ codeId, codeValue, used, revoked }: CodeActionsProps) {
  const [isRevokePending, startRevokeTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleRevoke() {
    startRevokeTransition(async () => {
      try {
        await revokeAccessCode(codeId)
        toast.success("Access code revoked", { description: codeValue })
      } catch {
        toast.error("Failed to revoke access code")
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteAccessCode(codeId)
        toast.success("Access code deleted", { description: codeValue })
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
