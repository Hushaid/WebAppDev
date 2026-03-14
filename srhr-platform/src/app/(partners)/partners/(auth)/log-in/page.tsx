import { LoginForm } from "@/components/auth/login-form"

export default function PartnersLogInPage() {
  return (
    <LoginForm
      title="Partner Log In"
      description="Sign in to the Hushaid partners dashboard."
      redirectTo="/partners"
    />
  )
}
