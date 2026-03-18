import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationBarProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  basePath: string
  searchParams?: Record<string, string>
}

function buildHref(basePath: string, page: number, searchParams?: Record<string, string>) {
  const params = new URLSearchParams()
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v)
    }
  }
  params.set("page", String(page))
  return `${basePath}?${params.toString()}`
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  basePath,
  searchParams,
}: PaginationBarProps) {
  if (total <= pageSize) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <footer className="shrink-0 border-t bg-background px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <p className="hidden text-sm text-muted-foreground sm:block">
          Showing {start}–{end} of {total}
        </p>
        <p className="text-sm text-muted-foreground sm:hidden">
          {start}–{end} of {total}
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={buildHref(basePath, page - 1, searchParams)}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {page}/{totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildHref(basePath, page + 1, searchParams)}>
              <Button variant="outline" size="sm">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  )
}
