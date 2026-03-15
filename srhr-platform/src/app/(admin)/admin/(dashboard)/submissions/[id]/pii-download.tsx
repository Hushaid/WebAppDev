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
import { Shield } from "lucide-react"
import { logPiiAccess } from "../actions"

interface PiiDownloadProps {
  submissionId: string
  actorId: string
  contactResponses: { question: string; value: string }[]
}

export function PiiDownload({ submissionId, actorId, contactResponses }: PiiDownloadProps) {
  const [revealed, setRevealed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  if (contactResponses.length === 0) return null

  function handleReveal() {
    startTransition(async () => {
      await logPiiAccess(actorId, submissionId)
      setRevealed(true)
      setOpen(false)
      toast.success("PII access logged in audit trail")
    })
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-4 w-4 text-yellow-600" />
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
          Subject Contact Information (PII)
        </h3>
      </div>
      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
        This information is personally identifiable and protected. All access is
        recorded in the audit log.
      </p>

      {revealed ? (
        <dl className="space-y-2">
          {contactResponses.map((r, i) => (
            <div key={i}>
              <dt className="text-sm font-medium text-muted-foreground">{r.question}</dt>
              <dd className="text-sm">{r.value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Shield className="mr-2 h-4 w-4" />
              Reveal Contact Info
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Access PII Data</DialogTitle>
              <DialogDescription>
                You are about to access personally identifiable information for
                this submission. This action will be logged in the audit trail
                with your user ID, timestamp, and IP address.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReveal} disabled={isPending}>
                {isPending ? "Logging access..." : "Confirm & Reveal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
