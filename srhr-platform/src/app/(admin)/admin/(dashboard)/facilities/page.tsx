export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { healthFacilities } from "@/lib/db/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

async function getFacilities() {
  return db
    .select()
    .from(healthFacilities)
    .orderBy(healthFacilities.name)
}

const typeColors: Record<string, string> = {
  PHC: "bg-blue-100 text-blue-800",
  "General Hospital": "bg-purple-100 text-purple-800",
  "Health Post": "bg-green-100 text-green-800",
  "Maternity Centre": "bg-pink-100 text-pink-800",
}

export default async function FacilitiesPage() {
  const facilities = await getFacilities()

  const typeGroups = facilities.reduce(
    (acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Health Facilities</h1>
          <p className="text-muted-foreground">
            Health facilities available for patient referrals based on risk assessments.
          </p>
        </hgroup>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Facilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{facilities.length}</p>
          </CardContent>
        </Card>
        {Object.entries(typeGroups).map(([type, count]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Coordinates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No facilities registered yet. Import facility data to populate this list.
                  </TableCell>
                </TableRow>
              ) : (
                facilities.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[f.type] || ""}>
                        {f.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{f.address ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.gpsLat && f.gpsLng
                        ? `${f.gpsLat}, ${f.gpsLng}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
