"use server"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function updateProfileAfterSignup(
  email: string,
  data: { sex: string; phone?: string; homeAddress?: string },
) {
  await db
    .update(users)
    .set({
      sex: data.sex,
      phone: data.phone || null,
      homeAddress: data.homeAddress || null,
      updatedAt: new Date(),
    })
    .where(eq(users.email, email))
}
