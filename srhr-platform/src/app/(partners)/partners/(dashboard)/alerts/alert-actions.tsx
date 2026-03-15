"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updatePartnerAlertStatus } from "./actions"

interface PartnerAlertActionsProps {
  alertId: string
  status: string
}

export function PartnerAlertActions({ alertId, status }: PartnerAlertActionsProps) {
  const [isPending, startTransition] = useTransition()

  if (status === "actioned" || status === "dismissed") return null

  function handleAction(newStatus: "actioned" | "dismissed") {
    startTransition(async () => {
      try {
        await updatePartnerAlertStatus(alertId, newStatus)
        toast.success(
          newStatus === "actioned"
            ? "Alert marked as actioned"
            : "Alert dismissed",
        )
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
