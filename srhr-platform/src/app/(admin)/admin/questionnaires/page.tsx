"use client"

import {
  SCORED_QUESTIONS,
  SKIP_RULES,
  MATERNAL_QUESTIONS,
  type QuestionConfig,
  type DiseaseGroup,
} from "@/lib/scoring/questions-config"
import {
  DEMOGRAPHIC_QUESTIONS,
  CLOSING_QUESTIONS,
} from "@/components/questionnaire/types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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

function getSkipRulesForQuestion(questionId: string) {
  return SKIP_RULES.filter((r) => r.questionId === questionId)
}

function getMaxScoreForGroup(group: DiseaseGroup) {
  return SCORED_QUESTIONS.filter((q) => q.diseaseGroup === group).reduce(
    (sum, q) => sum + q.maxScore,
    0,
  )
}

function QuestionEditDialog({ question }: { question: QuestionConfig }) {
  const skipRules = getSkipRulesForQuestion(question.id)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {question.id} — {GROUP_LABELS[question.diseaseGroup]}
          </DialogTitle>
        </DialogHeader>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Disease Group
            </dt>
            <dd>
              <Badge variant="outline">{question.diseaseGroup}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Max Score
            </dt>
            <dd className="text-lg font-semibold">{question.maxScore}</dd>
          </div>

          {question.options.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-2">
                Options & Scores
              </dt>
              <dd>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Option</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {question.options.map((opt) => (
                      <TableRow key={opt.value}>
                        <TableCell>{opt.label}</TableCell>
                        <TableCell>
                          <code className="text-xs">{opt.value}</code>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {opt.score}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </dd>
            </div>
          )}

          {skipRules.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-2">
                Skip Logic
              </dt>
              <dd className="space-y-2">
                {skipRules.map((rule) => (
                  <p key={rule.questionId} className="text-sm">
                    When answer is{" "}
                    <strong>{rule.skipWhen.join(" or ")}</strong> → skip{" "}
                    <strong>{rule.skipTargets.join(", ")}</strong>
                  </p>
                ))}
              </dd>
            </div>
          )}

          {question.diseaseGroup === "maternal_health" && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Gender Condition
              </dt>
              <dd className="text-sm">
                <Badge>Females only</Badge> — males skip all maternal health
                questions
              </dd>
            </div>
          )}
        </dl>
      </DialogContent>
    </Dialog>
  )
}

export default function QuestionnairesPage() {
  const groups: DiseaseGroup[] = ["sti", "maternal_health", "community_wellbeing"]

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">Questionnaire Management</h1>
          <p className="text-muted-foreground">
            View and manage scored questions, options, weights, and conditional
            skip logic.
          </p>
        </hgroup>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {DEMOGRAPHIC_QUESTIONS.length +
                SCORED_QUESTIONS.length +
                CLOSING_QUESTIONS.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {DEMOGRAPHIC_QUESTIONS.length} demographic +{" "}
              {SCORED_QUESTIONS.length} scored +{" "}
              {CLOSING_QUESTIONS.length} closing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Skip Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{SKIP_RULES.length}</p>
            <p className="text-xs text-muted-foreground">
              + gender-based maternal skip
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maternal Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{MATERNAL_QUESTIONS.length}</p>
            <p className="text-xs text-muted-foreground">Females only</p>
          </CardContent>
        </Card>
      </div>

      {/* Scored questions by group */}
      <Accordion type="multiple" defaultValue={groups}>
        {groups.map((group) => {
          const questions = SCORED_QUESTIONS.filter(
            (q) => q.diseaseGroup === group,
          )
          const maxScore = getMaxScoreForGroup(group)

          return (
            <AccordionItem key={group} value={group}>
              <AccordionTrigger className="text-lg font-semibold">
                <span className="flex items-center gap-3">
                  {GROUP_LABELS[group]}
                  <Badge variant="secondary">{GROUP_RANGES[group]}</Badge>
                  <Badge variant="outline">Max: {maxScore}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead className="w-24 text-right">
                        Max Score
                      </TableHead>
                      <TableHead className="w-28 text-right">
                        Skip Logic
                      </TableHead>
                      <TableHead className="w-28 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q) => {
                      const skipRules = getSkipRulesForQuestion(q.id)
                      return (
                        <TableRow key={q.id}>
                          <TableCell className="font-mono font-semibold">
                            {q.id}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {q.options.length > 0
                                ? q.options.map((o) => o.label).join(" · ")
                                : "Free text"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {q.maxScore}
                          </TableCell>
                          <TableCell className="text-right">
                            {skipRules.length > 0 ? (
                              <Badge variant="secondary">
                                Skips {skipRules.flatMap((r) => r.skipTargets).join(", ")}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <QuestionEditDialog question={q} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Non-scored questions reference */}
      <Accordion type="single" collapsible>
        <AccordionItem value="demographic">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-3">
              Demographic Questions (Not Scored)
              <Badge variant="secondary">Q1–Q10</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Question Text</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMOGRAPHIC_QUESTIONS.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-semibold">
                      {q.id}
                    </TableCell>
                    <TableCell>{q.text}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.type}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="closing">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-3">
              Closing Questions (Not Scored)
              <Badge variant="secondary">Q44–Q45</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Question Text</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLOSING_QUESTIONS.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-semibold">
                      {q.id}
                    </TableCell>
                    <TableCell>{q.text}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.type}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
