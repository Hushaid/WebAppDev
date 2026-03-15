export const dynamic = "force-dynamic"

import { getSubmissions } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Flag } from "lucide-react"
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
import { PaginationBar } from "@/components/pagination-bar"

function submitterTypeBadge(type: string) {
  return type === "field_worker" ? (
    <Badge variant="secondary">Field Worker</Badge>
  ) : (
    <Badge variant="outline">Personal</Badge>
  )
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const { items: submissions, total, totalPages, pageSize } = await getSubmissions(page)

  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      <div className="flex-1 overflow-y-auto p-6">
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
                    <TableRow key={sub.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/admin/submissions/${sub.id}`} className="block">
                          <span className="flex items-center gap-1.5">
                            <code className="text-xs">{sub.id.slice(0, 8)}...</code>
                            {sub.flaggedForReview && (
                              <Flag className="h-3.5 w-3.5 text-orange-500" aria-label="Flagged for review" />
                            )}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/submissions/${sub.id}`} className="block">
                          {submitterTypeBadge(sub.submitterType)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/submissions/${sub.id}`} className="block">
                          {sub.gpsLat ? (
                            <Badge variant="secondary">
                              {parseFloat(sub.gpsLat).toFixed(4)}, {parseFloat(sub.gpsLng!).toFixed(4)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/submissions/${sub.id}`} className="block">
                          <time dateTime={sub.createdAt.toISOString()}>
                            {sub.createdAt.toLocaleDateString()}
                          </time>
                        </Link>
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
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        basePath="/admin/submissions"
      />
    </div>
  )
}
