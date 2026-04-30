export const dynamic = "force-dynamic"

import Link from "next/link"
import { getHighRiskSubmissions } from "./actions"
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
import { UserCheck, UserX } from "lucide-react"

function riskVariant(level: string) {
  return level === "high" ? "destructive" : "secondary"
}

export default async function FieldWorkerReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const { items, total, totalPages, pageSize } = await getHighRiskSubmissions(page)

  const referredCount = items.filter((i) => i.referred).length
  const pendingCount = items.filter((i) => !i.referred).length

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold">Referrals</h1>
            <p className="text-muted-foreground">
              Individuals identified as high or medium risk who may need further support.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total flagged</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Referred</p>
              <p className="text-2xl font-bold text-green-600">{referredCount}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Awaiting referral</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                No high or medium risk assessments recorded yet. When you conduct an assessment where someone is identified as at risk, they will appear here so you can track whether they were referred for support.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Referral Status</TableHead>
                    <TableHead>Referred On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link href={`/field-worker/history/${item.id}`} className="hover:underline">
                          <time dateTime={item.createdAt.toISOString()}>
                            {item.createdAt.toLocaleDateString()}
                          </time>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/field-worker/history/${item.id}`} className="hover:underline">
                          <code className="text-xs">{item.id.slice(0, 8)}…</code>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={riskVariant(item.overallRiskLevel) as "destructive" | "secondary"}>
                          {item.overallRiskLevel.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.aggregateScore}</TableCell>
                      <TableCell>
                        {item.referred ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <UserCheck className="h-4 w-4" />
                            Referred
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <UserX className="h-4 w-4" />
                            Not yet referred
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.referredAt
                          ? item.referredAt.toLocaleDateString()
                          : "—"}
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
        basePath="/field-worker/referrals"
      />
    </div>
  )
}
