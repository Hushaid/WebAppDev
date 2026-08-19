"use client"

import { useState, useEffect } from "react"

export interface SubmissionItem {
  id: string
  submitter_id: string
  submitter_type: string
  gps_lat: string | null
  gps_lng: string | null
  created_at: string
  client_submission_id: string | null
}

export function useSubmissions(submitterId: string | undefined) {
  const [data, setData] = useState<SubmissionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submitterId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchSubmissions() {
      try {
        const res = await fetch(`/api/submissions/list?submitterId=${submitterId}`)
        if (!res.ok) throw new Error("Failed to fetch submissions")
        const rows = await res.json()
        if (!cancelled) {
          // Map snake_case DB columns to the format components expect
          setData(
            rows.map((r: Record<string, unknown>) => ({
              id: r.id,
              submitter_id: r.submitterId ?? r.submitter_id,
              submitter_type: r.submitterType ?? r.submitter_type,
              gps_lat: r.gpsLat ?? r.gps_lat,
              gps_lng: r.gpsLng ?? r.gps_lng,
              created_at: r.createdAt ?? r.created_at,
              client_submission_id: r.clientSubmissionId ?? r.client_submission_id,
            })),
          )
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchSubmissions()
    return () => { cancelled = true }
  }, [submitterId])

  return { data, isLoading, error }
}
