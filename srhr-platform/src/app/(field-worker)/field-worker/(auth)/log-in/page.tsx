import { LoginForm } from "@/components/auth/login-form"

export default function FieldWorkerLogInPage() {
  return (
    <LoginForm
      title="Field Worker Log In"
      description="Sign in to your field worker account."
      redirectTo="/field-worker"
      registerHref="/field-worker/register"
      registerLabel="Register with access code"
    />
  )
}
