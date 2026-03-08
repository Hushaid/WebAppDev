import { describe, it, expect, vi, beforeEach } from "vitest"

// Set env before importing
vi.stubEnv(
  "PII_ENCRYPTION_KEY",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
)

import { encryptPii, decryptPii, generateEncryptionKey } from "./encryption"

describe("PII encryption", () => {
  it("encrypts and decrypts a string", () => {
    const plaintext = "Aisha Mohammed"
    const encrypted = encryptPii(plaintext)

    expect(encrypted).not.toBe(plaintext)
    expect(decryptPii(encrypted)).toBe(plaintext)
  })

  it("produces different ciphertexts for the same plaintext (unique IV)", () => {
    const plaintext = "+234 801 234 5678"
    const a = encryptPii(plaintext)
    const b = encryptPii(plaintext)

    expect(a).not.toBe(b) // random IV → different ciphertext
    expect(decryptPii(a)).toBe(plaintext)
    expect(decryptPii(b)).toBe(plaintext)
  })

  it("handles empty strings", () => {
    const encrypted = encryptPii("")
    expect(decryptPii(encrypted)).toBe("")
  })

  it("handles unicode characters", () => {
    const plaintext = "Ọlátúnjí Adébáyò"
    const encrypted = encryptPii(plaintext)
    expect(decryptPii(encrypted)).toBe(plaintext)
  })

  it("generateEncryptionKey returns 64 hex characters", () => {
    const key = generateEncryptionKey()
    expect(key).toMatch(/^[0-9a-f]{64}$/)
  })
})
