import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getPartnerPreferences } from "@/app/(admin)/admin/(dashboard)/settings/actions"

export async function GET() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const prefs = await getPartnerPreferences(session.user.id)
  return NextResponse.json(prefs)
}
