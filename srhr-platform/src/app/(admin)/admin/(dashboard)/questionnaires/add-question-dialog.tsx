"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"
import { createQuestion } from "./actions"
import { toast } from "sonner"

type QuestionType = "single_choice" | "multiple_choice" | "yes_no" | "text"
type DiseaseGroup = "sti" | "maternal_health" | "community_wellbeing" | "none"

interface OptionRow {
  label: string
  value: string
  score: number
}

interface ExistingQuestion {
  questionNumber: string
  sortOrder: number
}

interface AddQuestionDialogProps {
  existingQuestions: ExistingQuestion[]
}

export function AddQuestionDialog({ existingQuestions }: AddQuestionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [questionNumber, setQuestionNumber] = useState("")
  const [text, setText] = useState("")
  const [type, setType] = useState<QuestionType>("single_choice")
  const [diseaseGroup, setDiseaseGroup] = useState<DiseaseGroup>("none")
  const [insertAfter, setInsertAfter] = useState<string>("end")
  const [options, setOptions] = useState<OptionRow[]>([
    { label: "", value: "option_1", score: 0 },
  ])

  const needsOptions = type !== "text"

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { label: "", value: `option_${prev.length + 1}`, score: 0 },
    ])
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateOption(index: number, field: keyof OptionRow, value: string | number) {
    setOptions((prev) =>
      prev.map((o, i) =>
        i === index
          ? {
              ...o,
              [field]: field === "score" ? (parseInt(value as string) || 0) : value,
              ...(field === "label" ? { value: (value as string).toLowerCase().replace(/\s+/g, "_") } : {}),
            }
          : o,
      ),
    )
  }

  function handleSave() {
    setError(null)
    if (!questionNumber.trim()) { setError("Question ID is required (e.g. Q46)"); return }
    if (!text.trim()) { setError("Question text is required"); return }
    if (needsOptions && options.some((o) => !o.label.trim())) {
      setError("All option labels are required")
      return
    }

    const selectedQuestion = existingQuestions.find((q) => q.questionNumber === insertAfter)
    const insertAfterSortOrder = selectedQuestion?.sortOrder ?? null

    startTransition(async () => {
      const result = await createQuestion({
        questionNumber: questionNumber.trim(),
        text: text.trim(),
        type,
        diseaseGroup: diseaseGroup === "none" ? null : diseaseGroup,
        options: needsOptions ? options.filter((o) => o.label.trim()) : [],
        insertAfterSortOrder,
      })

      if (result.success) {
        setOpen(false)
        router.refresh()
        toast.success(`Question ${questionNumber} added`)
        setQuestionNumber("")
        setText("")
        setType("single_choice")
        setDiseaseGroup("none")
        setInsertAfter("end")
        setOptions([{ label: "", value: "option_1", score: 0 }])
      } else {
        setError(result.error ?? "Failed to create question")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add New Question</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Question ID</Label>
              <Input
                value={questionNumber}
                onChange={(e) => setQuestionNumber(e.target.value)}
                placeholder="e.g. Q46"
              />
              <p className="text-xs text-muted-foreground">Unique identifier — cannot be changed later</p>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_choice">Single choice</SelectItem>
                  <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                  <SelectItem value="yes_no">Yes / No</SelectItem>
                  <SelectItem value="text">Free text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Position</Label>
            <Select value={insertAfter} onValueChange={setInsertAfter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="end">At the end</SelectItem>
                {existingQuestions.map((q) => (
                  <SelectItem key={q.questionNumber} value={q.questionNumber}>
                    After {q.questionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Where this question appears in the questionnaire</p>
          </div>

          <div className="space-y-1.5">
            <Label>Disease Group (optional)</Label>
            <Select value={diseaseGroup} onValueChange={(v) => setDiseaseGroup(v as DiseaseGroup)}>
              <SelectTrigger>
                <SelectValue placeholder="None (not scored)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (not scored)</SelectItem>
                <SelectItem value="sti">Infection Risk (STI)</SelectItem>
                <SelectItem value="maternal_health">Maternal Health</SelectItem>
                <SelectItem value="community_wellbeing">Community Well-being</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Question Text</Label>
            <textarea
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              rows={3}
              placeholder="Enter the question text…"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {needsOptions && (
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
                          onChange={(e) => updateOption(i, "label", e.target.value)}
                          placeholder="Option label"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          min={0}
                          value={opt.score}
                          onChange={(e) => updateOption(i, "score", e.target.value)}
                          className="h-8 w-16 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => removeOption(i)}
                          disabled={options.length <= 1}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addOption}>
                + Add Option
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Adding…" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
