export const dynamic = "force-dynamic"

import Link from "next/link"
import { getFieldWorkerSubmissions } from "./actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PaginationBar } from "@/components/pagination-bar"

export default async function FieldWorkerHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const { items: submissions, total, totalPages, pageSize } =
    await getFieldWorkerSubmissions(page)

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold">Assessment History</h1>
            <p className="text-muted-foreground">
              All the health assessments you have conducted.
            </p>
          </header>

          {submissions.length === 0 ? (
            <p className="text-muted-foreground">
              You have not conducted any assessments yet. Start a new assessment
              to see your history here.
            </p>
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
                      key={sub.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <Link
                          href={`/field-worker/history/${sub.id}`}
                          className="block"
                        >
                          <time dateTime={sub.createdAt.toISOString()}>
                            {sub.createdAt.toLocaleDateString()}
                          </time>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/field-worker/history/${sub.id}`}
                          className="block"
                        >
                          <code className="text-xs">
                            {sub.id.slice(0, 8)}...
                          </code>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/field-worker/history/${sub.id}`}
                          className="block"
                        >
                          <Badge variant="outline">
                            {sub.submitterType.replace("_", " ")}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/field-worker/history/${sub.id}`}
                          className="block"
                        >
                          {sub.gpsLat ? (
                            <Badge variant="secondary">Captured</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
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
        basePath="/field-worker/history"
      />
    </div>
  )
}
