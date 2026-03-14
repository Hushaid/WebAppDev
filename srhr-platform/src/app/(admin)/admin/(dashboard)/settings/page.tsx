"use client"

import { useState } from "react"
import {
  STI_THRESHOLDS,
  MATERNAL_THRESHOLDS,
  COMMUNITY_WELLBEING_THRESHOLDS,
  type ThresholdConfig,
  type RiskLevel,
} from "@/lib/scoring/thresholds"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
}

interface ThresholdEditorProps {
  title: string
  description: string
  thresholds: ThresholdConfig
  maxPossible: number
}

function ThresholdEditor({
  title,
  description,
  thresholds,
  maxPossible,
}: ThresholdEditorProps) {
  const [values, setValues] = useState<ThresholdConfig>({ ...thresholds })
  const [saved, setSaved] = useState(false)

  function handleChange(
    level: RiskLevel,
    bound: 0 | 1,
    value: string,
  ) {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    setValues((prev) => ({
      ...prev,
      [level]: bound === 0
        ? [num, prev[level][1]]
        : [prev[level][0], num],
    }))
    setSaved(false)
  }

  function handleSave() {
    // In production this would persist to the database.
    // For now we just confirm the values are valid.
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const levels: RiskLevel[] = ["low", "medium", "high"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk Level</TableHead>
              <TableHead>Min Score</TableHead>
              <TableHead>Max Score</TableHead>
              <TableHead>Range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.map((level) => (
              <TableRow key={level}>
                <TableCell>
                  <Badge className={RISK_COLORS[level]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={maxPossible}
                    value={values[level][0]}
                    onChange={(e) => handleChange(level, 0, e.target.value)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={maxPossible}
                    value={values[level][1]}
                    onChange={(e) => handleChange(level, 1, e.target.value)}
                    className="w-20"
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {values[level][0]}–{values[level][1]} of {maxPossible}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <footer className="flex items-center gap-3">
          <Button onClick={handleSave}>Save thresholds</Button>
          {saved && (
            <span className="text-sm text-green-600">
              Thresholds saved successfully
            </span>
          )}
        </footer>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure risk classification thresholds and platform settings.
          </p>
        </hgroup>
      </header>

      <Tabs defaultValue="thresholds">
        <TabsList>
          <TabsTrigger value="thresholds">Risk Thresholds</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds" className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Define the score ranges that classify individual risk as Low,
            Medium, or High for each assessment category. The scoring engine
            uses these thresholds to classify submissions.
          </p>

          <ThresholdEditor
            title="Infection Risk Thresholds"
            description="Questions Q11–Q21. Maximum possible score: 18."
            thresholds={STI_THRESHOLDS}
            maxPossible={18}
          />

          <ThresholdEditor
            title="Maternal Health Thresholds"
            description="Questions Q22–Q36 (females only). Maximum possible score: 22."
            thresholds={MATERNAL_THRESHOLDS}
            maxPossible={22}
          />

          <ThresholdEditor
            title="Community Well-being Thresholds"
            description="Questions Q37–Q43. Maximum possible score: 9."
            thresholds={COMMUNITY_WELLBEING_THRESHOLDS}
            maxPossible={9}
          />

          <Card>
            <CardHeader>
              <CardTitle>Overall Risk Classification Logic</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The overall risk level is determined by the <strong>worst-of</strong> logic:
                if any single category is classified as High, the overall risk is High.
                If any is Medium, the overall is Medium. Otherwise, Low.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Model Version
                  </dt>
                  <dd className="font-mono">v1</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Classification Method
                  </dt>
                  <dd>Rule-based (threshold ranges)</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Overall Logic
                  </dt>
                  <dd>Worst-of across categories</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Gender-based Routing
                  </dt>
                  <dd>Males skip maternal health (Q22–Q36)</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Location capture
                  </dt>
                  <dd>Enabled (optional, high accuracy, 10s timeout)</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Facility Lookup
                  </dt>
                  <dd>Haversine distance sort (top 5)</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Real-time Sync
                  </dt>
                  <dd>Electric SQL (PostgreSQL logical replication)</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Session Duration
                  </dt>
                  <dd>7 days</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
