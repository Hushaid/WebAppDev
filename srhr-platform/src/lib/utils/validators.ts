/**
 * Zod validation schemas for API input sanitization.
 */

import { z } from "zod"

/** UUID v4 format */
const uuid = z.string().uuid()

/** GPS coordinate: latitude (-90 to 90) */
const gpsLat = z
  .string()
  .regex(/^-?\d+\.?\d*$/, "Invalid latitude")

/** GPS coordinate: longitude (-180 to 180) */
const gpsLng = z
  .string()
  .regex(/^-?\d+\.?\d*$/, "Invalid longitude")

/** Strip HTML/script tags from free-text input */
function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim()
}

const sanitizedText = z.string().transform(sanitizeText)

/** Submission payload validation */
export const submissionSchema = z.object({
  submitterId: uuid,
  submitterType: z.enum(["field_worker", "personal_user"]),
  questionnaireVersionId: z.string().min(1),
  subjectId: uuid.optional(),
  gpsLat: gpsLat.optional(),
  gpsLng: gpsLng.optional(),
  sex: z.enum(["male", "female"]),
  responses: z.record(z.string(), z.string()),
  clientSubmissionId: uuid.optional(),
  bypassDedup: z.boolean().optional(),
})

/** Subject registration validation */
export const subjectRegistrationSchema = z.object({
  firstName: sanitizedText.pipe(z.string().min(1).max(100)),
  lastName: sanitizedText.pipe(z.string().min(1).max(100)),
  age: z.number().int().min(10).max(120),
  sex: z.enum(["male", "female"]),
  ward: sanitizedText.pipe(z.string().min(1).max(100)).optional(),
  lga: sanitizedText.pipe(z.string().min(1).max(100)).optional(),
})

/** Personal user registration */
export const personalRegistrationSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number",
    ),
  name: sanitizedText.pipe(z.string().min(1).max(200)),
})

/** Access code validation */
export const accessCodeSchema = z.object({
  code: z
    .string()
    .length(8)
    .regex(/^[A-Z0-9]+$/, "Invalid access code format"),
})

/** Pagination params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SubmissionInput = z.infer<typeof submissionSchema>
export type SubjectRegistrationInput = z.infer<typeof subjectRegistrationSchema>
export type PersonalRegistrationInput = z.infer<typeof personalRegistrationSchema>
