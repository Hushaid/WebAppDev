"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function GenerateCodeButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await fetch("/api/admin/access-codes", {
        method: "POST",
      }).then((response) => response.json())

      if (!result.success) {
        toast.error(result.error ?? "Failed to generate access code")
        return
      }

      toast.success("Access code generated", {
        description: result.code,
      })
      router.refresh()
    })
  }

  return (
    <Button onClick={handleGenerate} disabled={isPending}>
      {isPending ? "Generating..." : "Generate code"}
    </Button>
  )
}
