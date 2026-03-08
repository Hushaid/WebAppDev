import { describe, it, expect } from "vitest"
import {
  classifyRisk,
  STI_THRESHOLDS,
  MATERNAL_THRESHOLDS,
  COMMUNITY_WELLBEING_THRESHOLDS,
} from "./thresholds"

describe("classifyRisk", () => {
  describe("STI thresholds (low: 1-6, medium: 7-12, high: 13-18)", () => {
    it.each([
      [0, "low"],
      [1, "low"],
      [6, "low"],
      [7, "medium"],
      [12, "medium"],
      [13, "high"],
      [18, "high"],
    ] as const)("score %d → %s", (score, expected) => {
      expect(classifyRisk(score, STI_THRESHOLDS)).toBe(expected)
    })
  })

  describe("Maternal thresholds (low: 1-7, medium: 8-14, high: 15-21)", () => {
    it.each([
      [0, "low"],
      [7, "low"],
      [8, "medium"],
      [14, "medium"],
      [15, "high"],
      [21, "high"],
    ] as const)("score %d → %s", (score, expected) => {
      expect(classifyRisk(score, MATERNAL_THRESHOLDS)).toBe(expected)
    })
  })

  describe("Community thresholds (low: 1-3, medium: 4-6, high: 7-9)", () => {
    it.each([
      [0, "low"],
      [3, "low"],
      [4, "medium"],
      [6, "medium"],
      [7, "high"],
      [9, "high"],
    ] as const)("score %d → %s", (score, expected) => {
      expect(classifyRisk(score, COMMUNITY_WELLBEING_THRESHOLDS)).toBe(expected)
    })
  })
})
