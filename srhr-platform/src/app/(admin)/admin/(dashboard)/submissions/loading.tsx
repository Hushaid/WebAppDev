import { Skeleton } from "@/components/ui/skeleton"

export default function SubmissionsLoading() {
  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <section className="space-y-6">
          <header>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-96" />
          </header>

          {/* Filter bar skeleton */}
          <div className="flex flex-wrap items-end gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-40" />
              </div>
            ))}
            <Skeleton className="h-9 w-9" />
          </div>

          {/* Table skeleton */}
          <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 border-b pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
            {/* Rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-8 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
