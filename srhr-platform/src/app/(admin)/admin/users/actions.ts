"use server"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type UserRole =
  | "personal_user"
  | "field_worker"
  | "partner"
  | "gis_analyst"
  | "admin"
  | "super_admin"

type UserStatus = "active" | "inactive" | "suspended"

export async function getUsers() {
  return db.select().from(users).orderBy(users.createdAt)
}

export async function updateUserRole(userId: string, role: UserRole) {
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))

  revalidatePath("/admin/users")
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId))

  revalidatePath("/admin/users")
}
