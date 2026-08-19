"use client"

import { useState } from "react"
import { toast } from "sonner"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { getAllAlertsForExport } from "./actions"

export function ExportAlertsButton() {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const rows = await getAllAlertsForExport()

      if (rows.length === 0) {
        toast.error("No alerts to export.")
        return
      }

      const csvData = rows.map((row) => ({
        id: row.id,
        type: row.type,
        risk_level: row.riskLevel,
        status: row.status,
        title: row.title,
        message: row.message ?? "",
        recipient_name: row.recipientName ?? "",
        recipient_email: row.recipientEmail ?? "",
        admin_note: row.adminNote ?? "",
        sent_at: row.sentAt ? new Date(row.sentAt).toISOString() : "",
        created_at: new Date(row.createdAt).toISOString(),
      }))

      const csv = Papa.unparse(csvData)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `alerts-export-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${rows.length} alert records`)
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      <Download className="mr-2 h-4 w-4" />
      {exporting ? "Exporting..." : "Export CSV"}
    </Button>
  )
}
