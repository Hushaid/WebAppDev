"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TrendPoint {
  period: string
  sti_avg: number | null
  maternal_avg: number | null
  community_avg: number | null
  overall: number
  submissions: number
}

interface IrixTrendChartProps {
  data: TrendPoint[]
  title?: string
}

export function IrixTrendChart({
  data,
  title = "IRIX Score Trends",
}: IrixTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No trend data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#6366f1"
              strokeWidth={2}
              name="Overall IRIX"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="sti_avg"
              stroke="#ef4444"
              strokeWidth={1.5}
              name="STI Avg"
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="maternal_avg"
              stroke="#f59e0b"
              strokeWidth={1.5}
              name="Maternal Avg"
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="community_avg"
              stroke="#22c55e"
              strokeWidth={1.5}
              name="Community Avg"
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
