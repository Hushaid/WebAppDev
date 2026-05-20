"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"

function FieldWorkerLoginContent() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"

  return (
    <LoginForm
      title="Field Worker Log In"
      description="Sign in to your field worker account."
      redirectTo="/field-worker"
      registerHref="/field-worker/register"
      registerLabel="Register with access code"
      successMessage={
        justRegistered
          ? "Registration successful! Log in with your new credentials."
          : undefined
      }
    />
  )
}

export default function FieldWorkerLogInPage() {
  return (
    <Suspense>
      <FieldWorkerLoginContent />
    </Suspense>
  )
}
