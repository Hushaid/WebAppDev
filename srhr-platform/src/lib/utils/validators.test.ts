import { describe, it, expect } from "vitest"
import {
  submissionSchema,
  personalRegistrationSchema,
  accessCodeSchema,
} from "./validators"

describe("submissionSchema", () => {
  const validPayload = {
    submitterId: "550e8400-e29b-41d4-a716-446655440000",
    submitterType: "field_worker",
    questionnaireVersionId: "550e8400-e29b-41d4-a716-446655440001",
    sex: "male",
    responses: { Q11: "no_symptom" },
  }

  it("accepts valid payload", () => {
    const result = submissionSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it("rejects invalid submitterType", () => {
    const result = submissionSchema.safeParse({
      ...validPayload,
      submitterType: "hacker",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid UUID", () => {
    const result = submissionSchema.safeParse({
      ...validPayload,
      submitterId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid sex", () => {
    const result = submissionSchema.safeParse({
      ...validPayload,
      sex: "other",
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional subjectId", () => {
    const result = submissionSchema.safeParse({
      ...validPayload,
      subjectId: "550e8400-e29b-41d4-a716-446655440002",
    })
    expect(result.success).toBe(true)
  })
})

describe("personalRegistrationSchema", () => {
  it("accepts valid registration", () => {
    const result = personalRegistrationSchema.safeParse({
      email: "user@example.com",
      password: "SecurePass1",
      name: "Aisha",
    })
    expect(result.success).toBe(true)
  })

  it("rejects weak password", () => {
    const result = personalRegistrationSchema.safeParse({
      email: "user@example.com",
      password: "weak",
      name: "Aisha",
    })
    expect(result.success).toBe(false)
  })

  it("strips HTML from name", () => {
    const result = personalRegistrationSchema.safeParse({
      email: "user@example.com",
      password: "SecurePass1",
      name: '<script>alert("xss")</script>Aisha',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('alert("xss")Aisha')
    }
  })

  it("rejects invalid email", () => {
    const result = personalRegistrationSchema.safeParse({
      email: "not-an-email",
      password: "SecurePass1",
      name: "Aisha",
    })
    expect(result.success).toBe(false)
  })
})

describe("accessCodeSchema", () => {
  it("accepts valid 8-char alphanumeric code", () => {
    const result = accessCodeSchema.safeParse({ code: "ABCD1234" })
    expect(result.success).toBe(true)
  })

  it("rejects lowercase codes", () => {
    const result = accessCodeSchema.safeParse({ code: "abcd1234" })
    expect(result.success).toBe(false)
  })

  it("rejects wrong length", () => {
    const result = accessCodeSchema.safeParse({ code: "ABC" })
    expect(result.success).toBe(false)
  })
})
