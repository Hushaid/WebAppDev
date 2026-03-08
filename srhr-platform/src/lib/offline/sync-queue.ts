import {
  getPendingSubmissions,
  updatePendingStatus,
  removePendingSubmission,
  purgeStalePending,
} from "./db"

const MAX_RETRIES = 5
const BASE_DELAY_MS = 2000

function backoffDelay(retryCount: number): number {
  // Exponential backoff: 2s, 4s, 8s, 16s, 32s
  return BASE_DELAY_MS * Math.pow(2, retryCount)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function processQueue(): Promise<{
  synced: number
  failed: number
}> {
  // Purge entries older than 48h
  await purgeStalePending()

  const pending = await getPendingSubmissions()
  let synced = 0
  let failed = 0

  for (const entry of pending) {
    if (entry.status === "syncing") continue
    if (entry.retryCount >= MAX_RETRIES) {
      failed++
      continue
    }

    await updatePendingStatus(entry.id, "syncing")

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      })

      if (res.ok) {
        await removePendingSubmission(entry.id)
        synced++
      } else {
        const text = await res.text().catch(() => "Unknown error")
        await updatePendingStatus(entry.id, "failed", text)
        failed++
      }
    } catch (err) {
      await updatePendingStatus(
        entry.id,
        "failed",
        err instanceof Error ? err.message : "Network error",
      )
      failed++
    }

    // Brief pause between entries
    if (pending.indexOf(entry) < pending.length - 1) {
      await sleep(backoffDelay(entry.retryCount))
    }
  }

  return { synced, failed }
}

let syncInterval: ReturnType<typeof setInterval> | null = null

export function startSyncLoop(intervalMs = 30_000) {
  if (syncInterval) return
  // Attempt immediate sync
  processQueue()
  syncInterval = setInterval(processQueue, intervalMs)
}

export function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
