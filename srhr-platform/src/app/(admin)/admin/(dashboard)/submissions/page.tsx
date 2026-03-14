export const dynamic = "force-dynamic"

import { getSubmissions } from "./actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function submitterTypeBadge(type: string) {
  return type === "field_worker" ? (
    <Badge variant="secondary">Field Worker</Badge>
  ) : (
    <Badge variant="outline">Personal</Badge>
  )
}

export default async function SubmissionsPage() {
  const submissions = await getSubmissions()

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Submissions</h1>
          <p className="text-muted-foreground">
            Review individual questionnaire submissions and risk classifications.
          </p>
        </hgroup>
      </header>

      {submissions.length === 0 ? (
        <p className="text-muted-foreground">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <code className="text-xs">{sub.id.slice(0, 8)}...</code>
                </TableCell>
                <TableCell>{submitterTypeBadge(sub.submitterType)}</TableCell>
                <TableCell>
                  {sub.gpsLat ? (
                    <Badge variant="secondary">
                      {parseFloat(sub.gpsLat).toFixed(4)}, {parseFloat(sub.gpsLng!).toFixed(4)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <time dateTime={sub.createdAt.toISOString()}>
                    {sub.createdAt.toLocaleDateString()}
                  </time>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/submissions/${sub.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
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
