"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center">
          <section className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              onClick={reset}
              className="rounded bg-primary px-4 py-2 text-primary-foreground"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
