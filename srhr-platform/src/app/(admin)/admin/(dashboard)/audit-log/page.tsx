export const dynamic = "force-dynamic"

import { getAuditLogs } from "./actions"
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

function actionBadge(action: string) {
  if (action.includes("delete") || action.includes("revoke")) {
    return <Badge variant="destructive">{action.replace(/_/g, " ")}</Badge>
  }
  if (action.includes("create") || action.includes("generate") || action === "register") {
    return <Badge variant="default">{action.replace(/_/g, " ")}</Badge>
  }
  if (action === "login") {
    return <Badge variant="secondary">{action}</Badge>
  }
  if (action.includes("pii")) {
    return <Badge variant="secondary">{action.replace(/_/g, " ")}</Badge>
  }
  if (action.includes("update")) {
    return <Badge variant="outline">{action.replace(/_/g, " ")}</Badge>
  }
  return <Badge variant="outline">{action.replace(/_/g, " ")}</Badge>
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const { items: logs, total, totalPages, pageSize } = await getAuditLogs(page)

  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <section className="space-y-6">
          <header>
            <hgroup>
              <h1 className="text-2xl font-bold">Audit Log</h1>
              <p className="text-muted-foreground">
                Immutable record of all platform actions. This log cannot be edited
                or deleted.
              </p>
            </hgroup>
          </header>

          {logs.length === 0 ? (
            <p className="text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <time
                          dateTime={log.createdAt.toISOString()}
                          className="text-sm"
                        >
                          {log.createdAt.toLocaleString()}
                        </time>
                      </TableCell>
                      <TableCell>
                        {log.actorName ? (
                          <span className="text-sm">
                            {log.actorName}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {log.actorEmail}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>{actionBadge(log.action)}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log.entityType}
                          {log.entityId && (
                            <>
                              <br />
                              <code className="text-xs text-muted-foreground">
                                {log.entityId.slice(0, 8)}...
                              </code>
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.ipAddress ?? "—"}
                        </span>
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
        basePath="/admin/audit-log"
      />
    </div>
  )
}
