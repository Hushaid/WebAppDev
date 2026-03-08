"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SignOutButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <Button variant={variant} size="sm" onClick={handleSignOut}>
      <LogOut className="mr-1.5 size-4" />
      Sign Out
    </Button>
  )
}
