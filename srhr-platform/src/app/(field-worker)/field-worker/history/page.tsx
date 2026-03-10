"use client"

import { useRouter } from "next/navigation"
import { useElectricShape } from "@/lib/electric/use-shape"
import { useSession } from "@/lib/auth/client"
import type { SubmissionRow } from "@/lib/electric/shapes"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function FieldWorkerHistoryPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  // Real-time sync: submissions update automatically when new data hits Postgres
  const { data: submissions, isLoading } = useElectricShape<SubmissionRow>(
    "submissions",
    userId ? `"submitter_id" = '${userId}'` : undefined,
  )

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Assessment History</h1>
        <p className="text-muted-foreground">
          All the health assessments you have conducted. This list updates automatically.
        </p>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Loading your assessments...</p>
      ) : submissions.length === 0 ? (
        <p className="text-muted-foreground">You have not conducted any assessments yet. Start a new assessment to see your history here.</p>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow
                key={sub.id as string}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/field-worker/history/${sub.id}`)}
              >
                <TableCell>
                  <time dateTime={sub.created_at as string}>
                    {new Date(sub.created_at as string).toLocaleDateString()}
                  </time>
                </TableCell>
                <TableCell>
                  <code className="text-xs">
                    {(sub.id as string).slice(0, 8)}...
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {(sub.submitter_type as string).replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.gps_lat ? (
                    <Badge variant="secondary">Captured</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </section>
  )
}
