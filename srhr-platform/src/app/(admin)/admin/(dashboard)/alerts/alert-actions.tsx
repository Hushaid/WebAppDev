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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateAlertStatus } from "./actions"

interface AlertActionsProps {
  alertId: string
  status: string
  submissionId: string | null
  adminNote: string | null
}

export function AlertActions({
  alertId,
  status,
  submissionId,
  adminNote,
}: AlertActionsProps) {
  const [resolveOpen, setResolveOpen] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [resolveNote, setResolveNote] = useState("")
  const [dismissNote, setDismissNote] = useState("")
  const [isPending, startTransition] = useTransition()

  const isSettled = status === "actioned" || status === "dismissed"

  function handleResolve() {
    startTransition(async () => {
      try {
        await updateAlertStatus(alertId, "actioned", resolveNote)
        toast.success("Alert marked as resolved")
        setResolveOpen(false)
        setResolveNote("")
      } catch {
        toast.error("Failed to update alert")
      }
    })
  }

  function handleDismiss() {
    startTransition(async () => {
      try {
        await updateAlertStatus(alertId, "dismissed", dismissNote)
        toast.success("Alert dismissed")
        setDismissOpen(false)
        setDismissNote("")
      } catch {
        toast.error("Failed to update alert")
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Link to the originating submission if available */}
      {submissionId && (
        <a href={`/admin/submissions/${submissionId}`}>
          <Button variant="outline" size="sm" className="text-xs">
            View submission
          </Button>
        </a>
      )}

      {/* View Note — shown after resolution/dismissal when a note was left */}
      {isSettled && adminNote && (
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              View note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin note</DialogTitle>
              <DialogDescription>
                Note left when this alert was{" "}
                {status === "actioned" ? "marked as resolved" : "dismissed"}.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {adminNote}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mark as Resolved */}
      {!isSettled && (
        <Dialog open={resolveOpen} onOpenChange={(open) => {
          setResolveOpen(open)
          if (!open) setResolveNote("")
        }}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="text-xs">
              Mark as resolved
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark alert as resolved</DialogTitle>
              <DialogDescription>
                Confirm that you have reviewed and acted on this alert. Add a
                note describing what action was taken.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="resolve-note">
                Resolution note{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="resolve-note"
                placeholder="e.g. Dispatched community health worker to follow up with patient…"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={isPending}>
                {isPending ? "Saving…" : "Mark as resolved"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dismiss */}
      {!isSettled && (
        <Dialog open={dismissOpen} onOpenChange={(open) => {
          setDismissOpen(open)
          if (!open) setDismissNote("")
        }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              Dismiss
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dismiss alert</DialogTitle>
              <DialogDescription>
                Mark this alert as dismissed — no action needed. Add a note
                explaining why it is being dismissed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="dismiss-note">
                Dismissal reason{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="dismiss-note"
                placeholder="e.g. Duplicate alert — already handled under #abc123…"
                value={dismissNote}
                onChange={(e) => setDismissNote(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDismiss}
                disabled={isPending}
              >
                {isPending ? "Dismissing…" : "Dismiss alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
