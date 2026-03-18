"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check } from "lucide-react"

interface Option {
  label: string
  value: string
}

interface QuestionCardProps {
  questionId: string
  text: string
  type: "text" | "select" | "radio" | "checkbox"
  options?: Option[]
  value: string
  onChange: (value: string) => void
  onNext?: () => void
}

// ---------------------------------------------------------------------------
// CheckboxGroup — multi-select with "None of the above" exclusive toggle
// ---------------------------------------------------------------------------
function CheckboxGroup({
  questionId,
  options,
  value,
  onChange,
}: {
  questionId: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}) {
  const selectedValues = value ? value.split(",").filter(Boolean) : []
  const isNoneSelected = selectedValues.includes("none")
  const activeCount = selectedValues.filter((v) => v !== "none").length

  const regularOptions = options.filter((o) => o.value !== "none")
  const noneOption = options.find((o) => o.value === "none")

  function handleToggle(optValue: string, checked: boolean) {
    if (optValue === "none") {
      onChange(checked ? "none" : "")
      return
    }
    // Selecting a real item clears "none"
    const current = selectedValues.filter((v) => v !== "none")
    const next = checked
      ? [...current.filter((v) => v !== optValue), optValue]
      : current.filter((v) => v !== optValue)
    onChange(next.join(","))
  }

  return (
    <div className="space-y-2">
      {activeCount > 0 && (
        <p className="text-xs font-medium text-primary pb-1">
          {activeCount} {activeCount === 1 ? "item" : "items"} selected
        </p>
      )}

      {regularOptions.map((opt) => {
        const isChecked = !isNoneSelected && selectedValues.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            id={`${questionId}-${opt.value}`}
            onClick={() => handleToggle(opt.value, !isChecked)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
              isChecked
                ? "border-primary bg-primary/5 font-medium"
                : "border-border hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                isChecked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/50",
              )}
            >
              {isChecked && <Check className="h-3 w-3" />}
            </span>
            {opt.label}
          </button>
        )
      })}

      {noneOption && (
        <>
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t" />
            <span className="px-2 text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t" />
          </div>
          <button
            type="button"
            id={`${questionId}-none`}
            onClick={() => handleToggle("none", !isNoneSelected)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
              isNoneSelected
                ? "border-primary bg-primary/5 font-medium"
                : "border-border hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                isNoneSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/50",
              )}
            >
              {isNoneSelected && <Check className="h-3 w-3" />}
            </span>
            {noneOption.label}
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------
export function QuestionCard({
  questionId,
  text,
  type,
  options,
  value,
  onChange,
  onNext,
}: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium leading-snug">
          <Label htmlFor={questionId}>{text}</Label>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {type === "text" && (
          <Input
            id={questionId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim() && onNext) {
                e.preventDefault()
                onNext()
              }
            }}
          />
        )}

        {type === "select" && options && (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={questionId}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {type === "radio" && options && (
          <RadioGroup value={value} onValueChange={onChange}>
            {options.map((opt) => (
              <fieldset key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={`${questionId}-${opt.value}`} />
                <Label htmlFor={`${questionId}-${opt.value}`} className="font-normal">
                  {opt.label}
                </Label>
              </fieldset>
            ))}
          </RadioGroup>
        )}

        {type === "checkbox" && options && (
          <CheckboxGroup
            questionId={questionId}
            options={options}
            value={value}
            onChange={onChange}
          />
        )}
      </CardContent>
    </Card>
  )
}
