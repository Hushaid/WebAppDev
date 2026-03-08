export type RiskLevel = "low" | "medium" | "high"

export interface ThresholdConfig {
  low: [number, number]
  medium: [number, number]
  high: [number, number]
}

export const STI_THRESHOLDS: ThresholdConfig = {
  low: [1, 6],
  medium: [7, 12],
  high: [13, 18],
}

export const MATERNAL_THRESHOLDS: ThresholdConfig = {
  low: [1, 7],
  medium: [8, 14],
  high: [15, 21],
}

export const COMMUNITY_WELLBEING_THRESHOLDS: ThresholdConfig = {
  low: [1, 3],
  medium: [4, 6],
  high: [7, 9],
}

export function classifyRisk(
  score: number,
  thresholds: ThresholdConfig,
): RiskLevel {
  if (score >= thresholds.high[0]) return "high"
  if (score >= thresholds.medium[0]) return "medium"
  return "low"
}
