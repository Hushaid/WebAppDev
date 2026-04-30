export const dynamic = "force-dynamic"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getQuestionnaireWithQuestions } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Eye } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { QuestionEditDialog } from "./question-edit-dialog"
import { AddQuestionDialog } from "./add-question-dialog"

type DiseaseGroup = "sti" | "maternal_health" | "community_wellbeing"

const GROUP_LABELS: Record<DiseaseGroup, string> = {
  sti: "Infection Risk Assessment",
  maternal_health: "Maternal Health Assessment",
  community_wellbeing: "Community Well-being",
}

const GROUP_RANGES: Record<DiseaseGroup, string> = {
  sti: "Q11–Q21",
  maternal_health: "Q22–Q36 (females only)",
  community_wellbeing: "Q37–Q43",
}

export default async function QuestionnairesPage() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  const isSuperAdmin = callerRole === "super_admin"

  const data = await getQuestionnaireWithQuestions()

  if (!data) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Questionnaire Management</h1>
          <p className="text-muted-foreground">
            No published questionnaire found. Run the seed script to create one.
          </p>
        </header>
      </section>
    )
  }

  const { questions } = data

  const scoredQuestions = questions.filter((q) => q.diseaseGroup !== null)
  const demographicQuestions = questions.filter(
    (q) =>
      q.diseaseGroup === null &&
      q.questionNumber.startsWith("Q") &&
      parseInt(q.questionNumber.slice(1)) <= 10,
  )
  const otherQuestions = questions.filter(
    (q) =>
      q.diseaseGroup === null &&
      !demographicQuestions.includes(q) &&
      (q.questionNumber.startsWith("Q") || q.questionNumber.startsWith("PS")),
  )

  const groups: DiseaseGroup[] = ["sti", "maternal_health", "community_wellbeing"]

  const totalQuestions = questions.length
  const skipRuleCount = scoredQuestions.filter(
    (q) =>
      q.conditionalLogic &&
      typeof q.conditionalLogic === "object" &&
      "skipTargets" in (q.conditionalLogic as Record<string, unknown>),
  ).length
  const maternalCount = scoredQuestions.filter(
    (q) => q.diseaseGroup === "maternal_health",
  ).length

  return (
    <section className="min-w-0 space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">Questionnaire Management</h1>
          <p className="text-muted-foreground">
            Edit questions, options, scores, and conditional skip logic.
            Changes take effect immediately for future submissions.
          </p>
        </hgroup>
        <div className="flex items-center gap-2">
          <AddQuestionDialog existingQuestions={questions.map((q) => ({ questionNumber: q.questionNumber, sortOrder: q.sortOrder, diseaseGroup: q.diseaseGroup ?? null }))} />
          <Link href="/admin/questionnaires/preview">
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </Link>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalQuestions}</p>
            <p className="text-xs text-muted-foreground">
              {demographicQuestions.length} demographic + {scoredQuestions.length} scored +{" "}
              {otherQuestions.length} other
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Skip Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{skipRuleCount}</p>
            <p className="text-xs text-muted-foreground">+ gender-based maternal skip</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Maternal Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{maternalCount}</p>
            <p className="text-xs text-muted-foreground">Females only</p>
          </CardContent>
        </Card>
      </div>

      {/* Demographic questions (Q1-Q10) — now editable */}
      <Accordion type="single" collapsible defaultValue="demographic">
        <AccordionItem value="demographic">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex flex-wrap items-center gap-2">
              Demographic Questions
              <Badge variant="secondary">Q1–Q10</Badge>
              <Badge variant="outline">Not scored</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Question Text</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demographicQuestions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono font-semibold">{q.questionNumber}</TableCell>
                      <TableCell className="whitespace-normal break-words text-sm">{q.text}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <QuestionEditDialog question={q} isSuperAdmin={isSuperAdmin} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Scored questions by group */}
      <Accordion type="multiple" defaultValue={groups}>
        {groups.map((group) => {
          const groupQuestions = scoredQuestions.filter((q) => q.diseaseGroup === group)
          const maxScore = groupQuestions.reduce((sum, q) => sum + q.scoreWeight, 0)

          return (
            <AccordionItem key={group} value={group}>
              <AccordionTrigger className="text-lg font-semibold">
                <span className="flex flex-wrap items-center gap-2">
                  {GROUP_LABELS[group]}
                  <Badge variant="secondary">{GROUP_RANGES[group]}</Badge>
                  <Badge variant="outline">Max: {maxScore}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead className="w-24 text-right">Max Score</TableHead>
                        <TableHead className="w-28 text-right">Skip Logic</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupQuestions.map((q) => {
                        const opts = (q.options ?? []) as { label: string; value: string; score: number }[]
                        const skipLogic = q.conditionalLogic as { skipWhen: string[]; skipTargets: string[] } | null
                        return (
                          <TableRow key={q.id}>
                            <TableCell className="font-mono font-semibold">{q.questionNumber}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              <span className="text-sm text-muted-foreground">
                                {opts.length > 0 ? opts.map((o) => o.label).join(" · ") : "Free text"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">{q.scoreWeight}</TableCell>
                            <TableCell className="text-right">
                              {skipLogic?.skipTargets ? (
                                <Badge variant="secondary" className="text-xs">
                                  Skips {skipLogic.skipTargets.join(", ")}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <QuestionEditDialog question={q} isSuperAdmin={isSuperAdmin} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Closing & Post-survey questions (Q44-Q45, PS1-PS5) — now editable */}
      <Accordion type="single" collapsible>
        <AccordionItem value="other">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex flex-wrap items-center gap-2">
              Closing &amp; Post-survey Questions
              <Badge variant="secondary">Q44–Q45, PS1–PS5</Badge>
              <Badge variant="outline">Not scored</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Question Text</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherQuestions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono font-semibold">{q.questionNumber}</TableCell>
                      <TableCell className="whitespace-normal break-words text-sm">{q.text}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <QuestionEditDialog question={q} isSuperAdmin={isSuperAdmin} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </section>
  )
}
