"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function CopyCodeButton({ code }: { code: string }) {
  function handleCopy() {
    navigator.clipboard.writeText(code)
    toast.success("Code copied to clipboard", { description: code })
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleCopy}
        aria-label={`Copy code ${code}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
        {code}
      </code>
    </div>
  )
}
