import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAccessCodes, generateAccessCode, revokeAccessCode } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function AccessCodesPage() {
  const codes = await getAccessCodes()

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">Access Codes</h1>
          <p className="text-muted-foreground">
            Generate and manage field worker access codes.
          </p>
        </hgroup>
        <form
          action={async () => {
            "use server"
            const s = await auth.api.getSession({ headers: await headers() })
            await generateAccessCode(s?.user?.id ?? "")
          }}
        >
          <Button type="submit">Generate code</Button>
        </form>
      </header>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issued At</TableHead>
            <TableHead>Used At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No access codes generated yet.
              </TableCell>
            </TableRow>
          ) : (
            codes.map((code) => (
              <TableRow key={code.id}>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                    {code.codeValue}
                  </code>
                </TableCell>
                <TableCell>
                  {code.revoked ? (
                    <Badge variant="destructive">Revoked</Badge>
                  ) : code.used ? (
                    <Badge variant="secondary">Used</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <time dateTime={code.issuedAt.toISOString()}>
                    {code.issuedAt.toLocaleDateString()}
                  </time>
                </TableCell>
                <TableCell>
                  {code.usedAt ? (
                    <time dateTime={code.usedAt.toISOString()}>
                      {code.usedAt.toLocaleDateString()}
                    </time>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {!code.revoked && !code.used && (
                    <form
                      action={async () => {
                        "use server"
                        await revokeAccessCode(code.id)
                      }}
                    >
                      <Button variant="destructive" size="sm" type="submit">
                        Revoke
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </section>
  )
}
