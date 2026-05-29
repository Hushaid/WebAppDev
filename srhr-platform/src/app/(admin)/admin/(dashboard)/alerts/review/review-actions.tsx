"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface ReviewActionsProps {
  alertId: string
  submissionId: string | null
}

export function ReviewActions({ alertId, submissionId }: ReviewActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<"approve" | "dismiss" | null>(null)

  function handleApprove() {
    setAction("approve")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/alerts/${alertId}/approve`, { method: "POST" })
        const data = await res.json()
        if (!data.success) throw new Error(data.error ?? "Failed")
        toast.success("Alert approved — emails dispatched to partners and admins")
        router.refresh()
      } catch {
        toast.error("Failed to approve alert")
      } finally {
        setAction(null)
      }
    })
  }

  function handleDismiss() {
    setAction("dismiss")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/alerts/${alertId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "dismissed" }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error ?? "Failed")
        toast.success("Alert dismissed — no notification sent")
        router.refresh()
      } catch {
        toast.error("Failed to dismiss alert")
      } finally {
        setAction(null)
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {submissionId && (
        <a href={`/admin/submissions/${submissionId}`}>
          <Button variant="outline" size="sm" className="text-xs">
            View submission
          </Button>
        </a>
      )}
      <Button
        size="sm"
        className="text-xs"
        onClick={handleApprove}
        disabled={isPending}
      >
        {isPending && action === "approve" ? "Sending…" : "Approve & Notify"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={handleDismiss}
        disabled={isPending}
      >
        {isPending && action === "dismiss" ? "Dismissing…" : "Dismiss"}
      </Button>
    </div>
  )
}
