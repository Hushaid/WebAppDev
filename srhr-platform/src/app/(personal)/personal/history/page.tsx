export const dynamic = "force-dynamic"

import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getPersonalSubmissions } from "./actions"
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

function riskVariant(level: string | null) {
  switch (level) {
    case "high":
      return "destructive" as const
    case "medium":
      return "secondary" as const
    default:
      return "default" as const
  }
}

export default async function PersonalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const t = await getTranslations("personal")
  const { items: submissions, total, totalPages, pageSize } =
    await getPersonalSubmissions(page)

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold">{t("historyPage.title")}</h1>
            <p className="text-muted-foreground">
              {t("historyPage.description")}
            </p>
          </header>

          {submissions.length === 0 ? (
            <p className="text-muted-foreground">
              {t("historyPage.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("historyPage.colDate")}</TableHead>
                    <TableHead>{t("historyPage.colRisk")}</TableHead>
                    <TableHead className="text-right">{t("historyPage.colScore")}</TableHead>
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
                          href={`/personal/history/${sub.id}`}
                          className="block"
                        >
                          <time dateTime={sub.createdAt.toISOString()}>
                            {sub.createdAt.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/personal/history/${sub.id}`}
                          className="block"
                        >
                          {sub.overallRiskLevel ? (
                            <Badge variant={riskVariant(sub.overallRiskLevel)}>
                              {t(`riskWord.${sub.overallRiskLevel}`)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/personal/history/${sub.id}`}
                          className="block font-mono"
                        >
                          {sub.aggregateScore ?? "—"}
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
        basePath="/personal/history"
      />
    </div>
  )
}
