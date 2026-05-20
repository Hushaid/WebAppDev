"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function ToastTriggers() {
  useEffect(() => {
    if (sessionStorage.getItem("emailVerified")) {
      sessionStorage.removeItem("emailVerified")
      toast.success("Email verified. Welcome!")
    }
  }, [])

  return null
}
