type TranslatedVariant = {
  text: string
  options?: Record<string, string>
}

export type QuestionTranslations = {
  pcm?: TranslatedVariant
  ha?: TranslatedVariant
}

export async function translateQuestion(
  text: string,
  options?: { value: string; label: string }[],
): Promise<QuestionTranslations> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return {}

  const optionsBlock = options?.length
    ? `\nAnswer options (translate each label, keep the key exactly as-is):\n${options.map((o) => `  "${o.value}": "${o.label}"`).join("\n")}`
    : ""

  const prompt = `You are translating a health survey question for Nigerian communities.
Translate the question and its options into:
1. Nigerian Pidgin English (pcm)
2. Hausa (ha)

Return ONLY valid JSON — no markdown, no explanation — in this exact shape:
{
  "pcm": { "text": "...", "options": { "key": "translation" } },
  "ha":  { "text": "...", "options": { "key": "translation" } }
}
Omit "options" from a locale object if there are no options.
Keep medical/health terms accurate and culturally appropriate.

Question: "${text}"${optionsBlock}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    },
  )

  if (!res.ok) return {}

  const json = await res.json()
  const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

  // Strip optional ```json fences the model sometimes adds
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()

  try {
    return JSON.parse(cleaned) as QuestionTranslations
  } catch {
    return {}
  }
}
