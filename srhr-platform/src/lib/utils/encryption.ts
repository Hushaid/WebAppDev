/**
 * AES-256-GCM encryption for PII fields.
 *
 * Used to encrypt sensitive data (names, phone numbers, addresses)
 * before storing in the database.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM standard
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.PII_ENCRYPTION_KEY
  if (!key) {
    throw new Error("PII_ENCRYPTION_KEY environment variable is required")
  }
  const buf = Buffer.from(key, "hex")
  if (buf.length !== 32) {
    throw new Error("PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes)")
  }
  return buf
}

/**
 * Encrypt a plaintext string. Returns base64-encoded ciphertext
 * with IV and auth tag prepended.
 *
 * Format: base64(iv + authTag + ciphertext)
 */
export function encryptPii(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack: iv (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString("base64")
}

/**
 * Decrypt a base64-encoded ciphertext produced by encryptPii.
 */
export function decryptPii(ciphertext: string): string {
  const key = getEncryptionKey()
  const packed = Buffer.from(ciphertext, "base64")

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

/**
 * Generate a new 256-bit encryption key (for initial setup).
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex")
}
