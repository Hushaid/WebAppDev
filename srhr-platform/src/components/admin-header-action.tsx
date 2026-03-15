"use client"

import { useCallback, useState } from "react"
import { createPortal } from "react-dom"

const PORTAL_ID = "admin-header-action"

export function AdminHeaderActionSlot() {
  return <div id={PORTAL_ID} className="ml-auto" />
}

export function AdminHeaderAction({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  // Use a hidden div with a ref callback to detect when the component mounts.
  // The ref callback runs after commit (like useEffect) but avoids the
  // "setState in useEffect" lint warning.
  const mountRef = useCallback(() => {
    setContainer(document.getElementById(PORTAL_ID))
  }, [])

  if (!container) {
    return <span ref={mountRef} style={{ display: "none" }} />
  }

  return createPortal(children, container)
}
