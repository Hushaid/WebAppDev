"use client"

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

interface Option {
  label: string
  value: string
}

interface QuestionCardProps {
  questionId: string
  text: string
  type: "text" | "select" | "radio"
  options?: Option[]
  value: string
  onChange: (value: string) => void
  onNext?: () => void
}

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
        <CardTitle className="text-base font-medium">
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
      </CardContent>
    </Card>
  )
}
