import { describe, it, expect } from "vitest"
import { computeRisk, type QuestionResponse } from "./engine"

/** Helper to build a response array from a record */
function responses(map: Record<string, string>): QuestionResponse[] {
  return Object.entries(map).map(([questionId, value]) => ({
    questionId,
    value,
  }))
}

describe("computeRisk", () => {
  // === MALE PATH ===
  describe("male respondent", () => {
    it("skips all maternal questions for males", () => {
      const result = computeRisk([], "male")
      expect(result.maternalScore).toBeNull()
      expect(result.maternalRiskLevel).toBeNull()
      // Q22-Q36 should all be skipped
      const maternalIds = [
        "Q22", "Q23", "Q24", "Q25", "Q26", "Q27", "Q28",
        "Q29", "Q30", "Q31", "Q32", "Q33", "Q34", "Q35", "Q36",
      ]
      for (const id of maternalIds) {
        expect(result.skippedQuestions).toContain(id)
      }
    })

    it("scores zero with no responses", () => {
      const result = computeRisk([], "male")
      expect(result.stiScore).toBe(0)
      expect(result.communityWellbeingScore).toBe(0)
      expect(result.aggregateScore).toBe(0)
      expect(result.overallRiskLevel).toBe("low")
    })

    it("computes max achievable STI score = 17", () => {
      // Q20="yes" (score 0) allows Q21 to be answered (score 2)
      // Q20="no" (score 1) would skip Q21, giving only 16
      // Max achievable: 3+2+2+2+1+2+1+1+1+0+2 = 17
      const result = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q12: "more_4_weeks", // 2
          Q13: "worse", // 2
          Q14: "never_tested", // 2
          Q15: "yes", // 1
          Q16: "never", // 2
          Q17: "yes", // 1
          Q18: "yes", // 1
          Q19: "yes", // 1
          Q20: "yes", // 0 (allows Q21)
          Q21: "condom", // 2
        }),
        "male",
      )
      expect(result.stiScore).toBe(17)
      expect(result.stiRiskLevel).toBe("high")
    })

    it("computes max community wellbeing score = 9", () => {
      const result = computeRisk(
        responses({
          Q37: "nurses_doctors", // 3
          Q38: "no", // 1
          Q39: "flooded", // 1
          Q40: "no", // 1
          Q41: "missed", // 1
          Q42: "no", // 1
          Q43: "no", // 1
        }),
        "male",
      )
      expect(result.communityWellbeingScore).toBe(9)
      expect(result.communityWellbeingRiskLevel).toBe("high")
    })
  })

  // === FEMALE PATH ===
  describe("female respondent", () => {
    it("includes maternal scores for females", () => {
      const result = computeRisk([], "female")
      expect(result.maternalScore).toBe(0)
      expect(result.maternalRiskLevel).toBe("low")
    })

    it("computes max maternal score = 22", () => {
      const result = computeRisk(
        responses({
          Q22: "yes", // 2
          Q24: "never", // 2
          Q25: "cultural", // 2
          Q26: "headaches,swelling,blurred_vision,bleeding,c_section", // 3 (5 complications)
          Q27: "under_18_or_over_35", // 1
          Q28: "under_2_years", // 1
          Q29: "home", // 1
          Q30: "yes", // 1
          Q31: "home", // 1
          Q32: "yes", // 1
          Q33: "more_3", // 2
          Q34: "pregnant", // 1
          Q35: "none", // 3
          Q36: "yes", // 1
        }),
        "female",
      )
      // Q22(2)+Q24(2)+Q25(2)+Q26(3)+Q27(1)+Q28(1)+Q29(1)+Q30(1)+Q31(1)+Q32(1)+Q33(2)+Q34(1)+Q35(3)+Q36(1) = 22
      expect(result.maternalScore).toBe(22)
      expect(result.maternalRiskLevel).toBe("high")
    })

    it("includes maternal in aggregate score for females", () => {
      const result = computeRisk(
        responses({
          Q22: "yes", // maternal 2
          Q37: "chew", // community 2
        }),
        "female",
      )
      expect(result.aggregateScore).toBe(
        result.stiScore + (result.maternalScore ?? 0) + result.communityWellbeingScore,
      )
    })
  })

  // === SKIP LOGIC ===
  describe("skip logic", () => {
    it("Q11=no_symptom skips Q12 and Q13", () => {
      const result = computeRisk(
        responses({
          Q11: "no_symptom",
          Q12: "more_4_weeks", // should be skipped → score 0
          Q13: "worse", // should be skipped → score 0
        }),
        "male",
      )
      expect(result.skippedQuestions).toContain("Q12")
      expect(result.skippedQuestions).toContain("Q13")
      expect(result.responseScores["Q12"]).toBe(0)
      expect(result.responseScores["Q13"]).toBe(0)
      expect(result.stiScore).toBe(0) // Q11 no_symptom = 0
    })

    it("Q15=no skips Q16", () => {
      const result = computeRisk(
        responses({
          Q15: "no",
          Q16: "never", // should be skipped → score 0
        }),
        "male",
      )
      expect(result.skippedQuestions).toContain("Q16")
      expect(result.responseScores["Q16"]).toBe(0)
    })

    it("Q22=no skips current-pregnancy questions (Q23-Q25, Q29-Q30)", () => {
      const result = computeRisk(
        responses({
          Q22: "no",
          Q24: "never", // should be skipped
          Q25: "cultural", // should be skipped
        }),
        "female",
      )
      // Q22=no skips current-pregnancy-specific questions only
      // Q26-Q28 are pregnancy history questions and still apply
      for (const qId of ["Q23", "Q24", "Q25", "Q29", "Q30"]) {
        expect(result.skippedQuestions).toContain(qId)
      }
      for (const qId of ["Q26", "Q27", "Q28"]) {
        expect(result.skippedQuestions).not.toContain(qId)
      }
    })

    it("Q22=not_sure also skips Q23-Q30", () => {
      const result = computeRisk(
        responses({ Q22: "not_sure" }),
        "female",
      )
      expect(result.skippedQuestions).toContain("Q24")
      expect(result.skippedQuestions).toContain("Q30")
    })
  })

  // === THRESHOLD BOUNDARIES ===
  describe("threshold boundaries", () => {
    it("STI: score 6 → low, score 7 → medium", () => {
      // Score exactly 6: Q11(3) + Q13(2) + Q15(1) = 6
      const low = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q13: "worse", // 2
          Q15: "yes", // 1
        }),
        "male",
      )
      expect(low.stiScore).toBe(6)
      expect(low.stiRiskLevel).toBe("low")

      // Score exactly 7: add Q14(1) = 7
      const medium = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q13: "worse", // 2
          Q15: "yes", // 1
          Q14: "more_6_months", // 1
        }),
        "male",
      )
      expect(medium.stiScore).toBe(7)
      expect(medium.stiRiskLevel).toBe("medium")
    })

    it("STI: score 12 → medium, score 13 → high", () => {
      // Build up to 12
      const medium = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q12: "more_4_weeks", // 2
          Q13: "worse", // 2
          Q14: "never_tested", // 2
          Q15: "yes", // 1
          Q16: "sometimes", // 1
          Q17: "yes", // 1
        }),
        "male",
      )
      expect(medium.stiScore).toBe(12)
      expect(medium.stiRiskLevel).toBe("medium")

      // Add Q18(1) → 13
      const high = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q12: "more_4_weeks", // 2
          Q13: "worse", // 2
          Q14: "never_tested", // 2
          Q15: "yes", // 1
          Q16: "sometimes", // 1
          Q17: "yes", // 1
          Q18: "yes", // 1
        }),
        "male",
      )
      expect(high.stiScore).toBe(13)
      expect(high.stiRiskLevel).toBe("high")
    })

    it("Community: score 3 → low, score 4 → medium, score 7 → high", () => {
      const low = computeRisk(
        responses({
          Q37: "nurses_doctors", // 3
        }),
        "male",
      )
      expect(low.communityWellbeingScore).toBe(3)
      expect(low.communityWellbeingRiskLevel).toBe("low")

      const medium = computeRisk(
        responses({
          Q37: "nurses_doctors", // 3
          Q38: "no", // 1
        }),
        "male",
      )
      expect(medium.communityWellbeingScore).toBe(4)
      expect(medium.communityWellbeingRiskLevel).toBe("medium")

      const high = computeRisk(
        responses({
          Q37: "nurses_doctors", // 3
          Q38: "no", // 1
          Q39: "flooded", // 1
          Q40: "no", // 1
          Q41: "missed", // 1
        }),
        "male",
      )
      expect(high.communityWellbeingScore).toBe(7)
      expect(high.communityWellbeingRiskLevel).toBe("high")
    })
  })

  // === OVERALL RISK ===
  describe("overall risk level", () => {
    it("any category HIGH → overall HIGH", () => {
      // High STI only
      const result = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q12: "more_4_weeks", // 2
          Q13: "worse", // 2
          Q14: "never_tested", // 2
          Q15: "yes", // 1
          Q16: "never", // 2
          Q17: "yes", // 1 = 13 → high
        }),
        "male",
      )
      expect(result.stiRiskLevel).toBe("high")
      expect(result.overallRiskLevel).toBe("high")
    })

    it("medium + low → overall MEDIUM", () => {
      const result = computeRisk(
        responses({
          Q11: "discharge,sores,burning,pain_sex,tummy_pain", // 3 (5 symptoms)
          Q12: "more_4_weeks", // 2
          Q13: "worse", // 2 = 7 → medium STI
        }),
        "male",
      )
      expect(result.stiRiskLevel).toBe("medium")
      expect(result.communityWellbeingRiskLevel).toBe("low")
      expect(result.overallRiskLevel).toBe("medium")
    })

    it("all low → overall LOW", () => {
      const result = computeRisk(
        responses({
          Q11: "no_symptom", // 0 (also skips Q12, Q13)
        }),
        "male",
      )
      expect(result.overallRiskLevel).toBe("low")
    })
  })

  // === Q23 NOT SCORED ===
  describe("Q23 (not scored)", () => {
    it("Q23 has maxScore 0 and does not contribute", () => {
      const result = computeRisk(
        responses({ Q22: "yes" }),
        "female",
      )
      expect(result.responseScores["Q23"]).toBe(0)
    })
  })

  // === UNKNOWN RESPONSES ===
  describe("edge cases", () => {
    it("unknown response value scores 0", () => {
      const result = computeRisk(
        responses({ Q11: "nonexistent_value" }),
        "male",
      )
      expect(result.stiScore).toBe(0)
    })

    it("unrecognized question IDs are ignored", () => {
      const result = computeRisk(
        responses({ Q99: "yes" }),
        "male",
      )
      expect(result.aggregateScore).toBe(0)
    })
  })
})
