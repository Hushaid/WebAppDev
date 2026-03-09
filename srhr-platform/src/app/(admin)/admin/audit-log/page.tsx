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

function actionBadge(action: string) {
  if (action.includes("delete") || action.includes("revoke")) {
    return <Badge variant="destructive">{action}</Badge>
  }
  if (action.includes("create") || action.includes("generate")) {
    return <Badge variant="default">{action}</Badge>
  }
  if (action.includes("pii")) {
    return <Badge variant="secondary">{action}</Badge>
  }
  return <Badge variant="outline">{action}</Badge>
}

export default async function AuditLogPage() {
  const logs = await getAuditLogs()

  return (
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
      )}
    </section>
  )
}
