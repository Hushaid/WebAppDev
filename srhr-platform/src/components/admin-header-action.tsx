"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

const PORTAL_ID = "admin-header-action"

export function AdminHeaderActionSlot() {
  return <div id={PORTAL_ID} className="ml-auto" />
}

export function AdminHeaderAction({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setContainer(document.getElementById(PORTAL_ID))
  }, [])

  if (!container) return null
  return createPortal(children, container)
}
