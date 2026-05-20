import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import crypto from "node:crypto"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "super_admin" || !session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized: super admin only." }, { status: 403 })
  }
  const code = crypto.randomBytes(4).toString("hex").toUpperCase()
  const [inserted] = await db.insert(fieldWorkerCodes).values({ codeValue: code, issuedBy: session.user.id }).returning()
  logAudit({ actorId: session.user.id, action: "generate", entityType: "access_code", entityId: inserted.id }).catch(console.error)
  revalidatePath("/admin/access-codes")
  return NextResponse.json({ success: true, code })
}

