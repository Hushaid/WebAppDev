import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questions, questionnaires } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const [questionnaire] = await db
    .select({ id: questionnaires.id })
    .from(questionnaires)
    .where(eq(questionnaires.status, "published"))
    .limit(1)

  if (!questionnaire) {
    return NextResponse.json([])
  }

  const rows = await db
    .select({
      id: questions.id,
      questionNumber: questions.questionNumber,
      text: questions.text,
      type: questions.type,
      options: questions.options,
      sortOrder: questions.sortOrder,
      translations: questions.translations,
    })
    .from(questions)
    .where(eq(questions.questionnaireId, questionnaire.id))
    .orderBy(asc(questions.sortOrder))

  return NextResponse.json(rows)
}
