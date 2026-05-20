import { openDB, type DBSchema, type IDBPDatabase } from "idb"

export interface PendingSubmission {
  id: string
  payload: Record<string, unknown>
  status: "pending" | "syncing" | "failed"
  retryCount: number
  createdAt: number
  lastAttemptAt: number | null
  errorMessage: string | null
}

export interface DraftSubmission {
  id: string
  data: Record<string, unknown>
  updatedAt: number
}

interface SrhrDB extends DBSchema {
  "pending-submissions": {
    key: string
    value: PendingSubmission
    indexes: { "by-status": string; "by-created": number }
  }
  "draft-submissions": {
    key: string
    value: DraftSubmission
    indexes: { "by-updated": number }
  }
}

let dbPromise: Promise<IDBPDatabase<SrhrDB>> | null = null

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<SrhrDB>("srhr-offline", 1, {
      upgrade(db) {
        const pendingStore = db.createObjectStore("pending-submissions", {
          keyPath: "id",
        })
        pendingStore.createIndex("by-status", "status")
        pendingStore.createIndex("by-created", "createdAt")

        const draftStore = db.createObjectStore("draft-submissions", {
          keyPath: "id",
        })
        draftStore.createIndex("by-updated", "updatedAt")
      },
    })
  }
  return dbPromise
}

export async function addPendingSubmission(
  payload: Record<string, unknown>,
): Promise<string> {
  const db = await getOfflineDB()
  const id = crypto.randomUUID()
  await db.put("pending-submissions", {
    id,
    payload,
    status: "pending",
    retryCount: 0,
    createdAt: Date.now(),
    lastAttemptAt: null,
    errorMessage: null,
  })
  return id
}

export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  const db = await getOfflineDB()
  return db.getAllFromIndex("pending-submissions", "by-created")
}

export async function updatePendingStatus(
  id: string,
  status: PendingSubmission["status"],
  errorMessage?: string,
) {
  const db = await getOfflineDB()
  const entry = await db.get("pending-submissions", id)
  if (!entry) return
  entry.status = status
  entry.lastAttemptAt = Date.now()
  if (status === "failed") {
    entry.retryCount += 1
    entry.errorMessage = errorMessage ?? null
  }
  await db.put("pending-submissions", entry)
}

export async function removePendingSubmission(id: string) {
  const db = await getOfflineDB()
  await db.delete("pending-submissions", id)
}

/** Remove pending submissions older than 48 hours */
export async function purgeStalePending() {
  const db = await getOfflineDB()
  const cutoff = Date.now() - 48 * 60 * 60 * 1000
  const all = await db.getAllFromIndex("pending-submissions", "by-created")
  for (const entry of all) {
    if (entry.createdAt < cutoff) {
      await db.delete("pending-submissions", entry.id)
    }
  }
}

export async function saveDraft(
  id: string,
  data: Record<string, unknown>,
) {
  const db = await getOfflineDB()
  await db.put("draft-submissions", { id, data, updatedAt: Date.now() })
}

export async function getDraft(id: string) {
  const db = await getOfflineDB()
  return db.get("draft-submissions", id)
}

export async function deleteDraft(id: string) {
  const db = await getOfflineDB()
  await db.delete("draft-submissions", id)
}
