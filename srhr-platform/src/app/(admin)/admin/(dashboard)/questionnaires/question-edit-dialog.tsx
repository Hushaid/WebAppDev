"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"
import { deleteQuestion } from "./actions"
import { toast } from "sonner"

interface OptionRow {
  label: string
  value: string
  score: number
}

interface QuestionData {
  id: string
  questionNumber: string
  text: string
  type: string
  scoreWeight: number
  diseaseGroup: string | null
  options: unknown
  conditionalLogic: unknown
}

export function QuestionEditDialog({ question, isSuperAdmin = false }: { question: QuestionData; isSuperAdmin?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const opts = (question.options ?? []) as OptionRow[]
  const skipLogic = question.conditionalLogic as {
    skipWhen: string[]
    skipTargets: string[]
  } | null

  const [text, setText] = useState(question.text)
  const [options, setOptions] = useState<OptionRow[]>(opts)
  const [skipWhen, setSkipWhen] = useState(skipLogic?.skipWhen?.join(", ") ?? "")
  const [skipTargets, setSkipTargets] = useState(skipLogic?.skipTargets?.join(", ") ?? "")

  function updateOptionScore(index: number, score: number) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, score } : o)))
  }

  function updateOptionLabel(index: number, label: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, label } : o)))
  }

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { label: "", value: `option_${prev.length + 1}`, score: 0 },
    ])
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const skipWhenArr = skipWhen.split(",").map((s) => s.trim()).filter(Boolean)
      const skipTargetsArr = skipTargets.split(",").map((s) => s.trim()).filter(Boolean)

      const result = await fetch(`/api/admin/questionnaires/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          options,
          conditionalLogic:
            skipWhenArr.length > 0 && skipTargetsArr.length > 0
              ? { skipWhen: skipWhenArr, skipTargets: skipTargetsArr }
              : null,
        }),
      }).then((response) => response.json())

      if (result.success) {
        setOpen(false)
        router.refresh()
        toast.success("Question saved")
      } else {
        setError(result.error ?? "Failed to save")
      }
    })
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startDeleteTransition(async () => {
      const result = await deleteQuestion(question.id)
      if (result.success) {
        setOpen(false)
        router.refresh()
        toast.success("Question deleted")
      } else {
        setError(result.error ?? "Failed to delete")
        setConfirmDelete(false)
      }
    })
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setText(question.text)
      setOptions(opts)
      setSkipWhen(skipLogic?.skipWhen?.join(", ") ?? "")
      setSkipTargets(skipLogic?.skipTargets?.join(", ") ?? "")
      setError(null)
      setConfirmDelete(false)
    }
    setOpen(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {question.questionNumber}
            {question.diseaseGroup && (
              <Badge variant="outline">{question.diseaseGroup.replace(/_/g, " ")}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text</Label>
            <textarea
              id="question-text"
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {(options.length > 0 || ["single_choice", "multiple_choice", "yes_no"].includes(question.type)) && (
            <div className="space-y-2">
              <Label>Options &amp; Scores</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-16">Score</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map((opt, i) => (
                    <TableRow key={i}>
                      <TableCell className="p-1">
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOptionLabel(i, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          min={0}
                          value={opt.score}
                          onChange={(e) => updateOptionScore(i, parseInt(e.target.value) || 0)}
                          className="h-8 w-16 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => removeOption(i)}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addOption} className="mt-1">
                + Add Option
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label>Max Score:</Label>
            <Badge variant="secondary" className="text-sm">
              {Math.max(0, ...options.map((o) => o.score))}
            </Badge>
            <span className="text-xs text-muted-foreground">
              (auto-computed from highest option score)
            </span>
          </div>

          <div className="space-y-2">
            <Label>Skip Logic</Label>
            <div className="grid gap-2">
              <div>
                <span className="text-xs text-muted-foreground">
                  When answer is (comma-separated values):
                </span>
                <Input
                  value={skipWhen}
                  onChange={(e) => setSkipWhen(e.target.value)}
                  placeholder="e.g. no, not_sure"
                  className="mt-1"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Skip these questions (comma-separated IDs):
                </span>
                <Input
                  value={skipTargets}
                  onChange={(e) => setSkipTargets(e.target.value)}
                  placeholder="e.g. Q23, Q24, Q25"
                  className="mt-1"
                />
              </div>
            </div>
            {!skipWhen && !skipTargets && (
              <p className="text-xs text-muted-foreground">
                No skip logic configured for this question.
              </p>
            )}
          </div>

          {question.diseaseGroup === "maternal_health" && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              <Badge className="mr-2">Females only</Badge>
              Males automatically skip all maternal health questions.
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="shrink-0 items-center">
          {isSuperAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {confirmDelete ? "Confirm delete?" : "Delete"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
