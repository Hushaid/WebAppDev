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

const dataSources = [
  {
    name: "CHIRPS",
    type: "Precipitation",
    resolution: "0.05° (~5.5km)",
    frequency: "Daily",
    coverage: "Nigeria",
    status: "active",
    description: "Climate Hazards InfraRed Precipitation with Station data",
  },
  {
    name: "ERA5",
    type: "Soil Moisture",
    resolution: "0.25° (~28km)",
    frequency: "Daily",
    coverage: "Nigeria",
    status: "active",
    description: "ECMWF Reanalysis v5 — soil moisture layers 1-4",
  },
  {
    name: "GloFAS",
    type: "River Discharge",
    resolution: "Station-based",
    frequency: "Daily forecast",
    coverage: "Benue/Niger basins",
    status: "active",
    description: "Global Flood Awareness System — river discharge forecasts",
  },
  {
    name: "Open-Meteo",
    type: "Weather Forecast",
    resolution: "Point-based",
    frequency: "Hourly (7-day)",
    coverage: "Nigeria LGAs",
    status: "active",
    description: "Weather API for precipitation forecasts per LGA",
  },
  {
    name: "FABDEM",
    type: "Terrain (DEM)",
    resolution: "30m",
    frequency: "Static",
    coverage: "Nigeria",
    status: "active",
    description: "Forest And Buildings removed DEM for HAND/TWI/slope",
  },
  {
    name: "WorldPop",
    type: "Population",
    resolution: "100m",
    frequency: "Annual",
    coverage: "Nigeria",
    status: "planned",
    description: "Population density estimates for exposure modelling",
  },
]

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  planned: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
}

export default function DataSourcesPage() {
  const activeCount = dataSources.filter((d) => d.status === "active").length

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">External Data Sources</h1>
          <p className="text-muted-foreground">
            Climate and environmental data sources feeding the flood prediction
            model.
          </p>
        </hgroup>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dataSources.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {dataSources.length - activeCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((ds) => (
                <TableRow key={ds.name}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ds.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{ds.type}</TableCell>
                  <TableCell className="text-xs">{ds.resolution}</TableCell>
                  <TableCell>{ds.frequency}</TableCell>
                  <TableCell>{ds.coverage}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[ds.status] || ""}>
                      {ds.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
