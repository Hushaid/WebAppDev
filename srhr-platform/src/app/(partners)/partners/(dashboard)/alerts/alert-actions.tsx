"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface PartnerAlertActionsProps {
  alertId: string
  status: string
}

export function PartnerAlertActions({ alertId, status }: PartnerAlertActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (status === "actioned" || status === "dismissed") return null

  function handleAction(newStatus: "actioned" | "dismissed") {
    startTransition(async () => {
      try {
        const result = await fetch(`/api/partners/alerts/${alertId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }).then((response) => response.json())
        if (!result.success) {
          throw new Error(result.error ?? "Failed to update alert")
        }
        toast.success(
          newStatus === "actioned"
            ? "Alert marked as actioned"
            : "Alert dismissed",
        )
        router.refresh()
      } catch {
        toast.error("Failed to update alert")
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="default"
        size="sm"
        className="text-xs"
        onClick={() => handleAction("actioned")}
        disabled={isPending}
      >
        Action
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => handleAction("dismissed")}
        disabled={isPending}
      >
        Dismiss
      </Button>
    </div>
  )
}
