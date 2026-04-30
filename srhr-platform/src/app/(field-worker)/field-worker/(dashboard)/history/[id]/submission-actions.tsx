"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Flag, UserCheck } from "lucide-react"
import Link from "next/link"

interface Props {
  submissionId: string
  initialFlagged: boolean
  initialReferred: boolean
  isHighOrMedium: boolean
}

export function SubmissionActions({
  submissionId,
  initialFlagged,
  initialReferred,
  isHighOrMedium,
}: Props) {
  const [flagged, setFlagged] = useState(initialFlagged)
  const [flagging, setFlagging] = useState(false)
  const [referred, setReferred] = useState(initialReferred)
  const [referring, setReferring] = useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background px-4 py-3">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/field-worker/history">Back to history</Link>
        </Button>

        {!flagged ? (
          <Button
            variant="outline"
            disabled={flagging}
            onClick={async () => {
              setFlagging(true)
              try {
                const res = await fetch("/api/submissions/flag", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ submissionId }),
                })
                if (res.ok) {
                  setFlagged(true)
                  toast.success("Submission flagged for admin review")
                } else {
                  toast.error("Failed to flag submission")
                }
              } catch {
                toast.error("Failed to flag submission")
              } finally {
                setFlagging(false)
              }
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            {flagging ? "Flagging…" : "Flag for review"}
          </Button>
        ) : (
          <Button variant="outline" disabled>
            <Flag className="mr-2 h-4 w-4" />
            Flagged
          </Button>
        )}

        {isHighOrMedium && (
          !referred ? (
            <Button
              variant="outline"
              disabled={referring}
              onClick={async () => {
                setReferring(true)
                try {
                  const res = await fetch("/api/submissions/refer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ submissionId }),
                  })
                  if (res.ok) {
                    setReferred(true)
                    toast.success("Marked as referred for further support")
                  } else {
                    toast.error("Failed to record referral")
                  }
                } catch {
                  toast.error("Failed to record referral")
                } finally {
                  setReferring(false)
                }
              }}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {referring ? "Recording…" : "Mark as Referred"}
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <UserCheck className="mr-2 h-4 w-4" />
              Referred
            </Button>
          )
        )}
      </div>
    </div>
  )
}
