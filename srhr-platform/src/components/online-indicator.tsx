"use client"

import { useEffect, useRef, useState } from "react"
import { useOnlineStatus } from "@/lib/offline/use-online-status"
import { getPendingSubmissions } from "@/lib/offline/db"
import { processQueue } from "@/lib/offline/sync-queue"

export function OnlineIndicator() {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const syncTriggered = useRef(false)

  useEffect(() => {
    async function checkPending() {
      try {
        const pending = await getPendingSubmissions()
        setPendingCount(pending.filter((p) => p.status !== "syncing").length)
      } catch {
        // IndexedDB not available (SSR or private browsing)
      }
    }
    checkPending()
    const interval = setInterval(checkPending, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncTriggered.current) {
      syncTriggered.current = true
      const run = async () => {
        setSyncing(true)
        try {
          await processQueue()
        } finally {
          setSyncing(false)
          syncTriggered.current = false
        }
      }
      // Defer state update out of render via microtask
      queueMicrotask(() => { run() })
    }
  }, [isOnline, pendingCount])

  if (isOnline && pendingCount === 0) {
    return (
      <mark className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
        Online
      </mark>
    )
  }

  if (isOnline && syncing) {
    return (
      <mark className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        Syncing {pendingCount}...
      </mark>
    )
  }

  if (isOnline && pendingCount > 0) {
    return (
      <mark className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {pendingCount} pending
      </mark>
    )
  }

  return (
    <mark className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
      Offline {pendingCount > 0 ? `(${pendingCount})` : ""}
    </mark>
  )
}
