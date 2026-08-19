import { Shape, type Value } from "@electric-sql/client"
import { createShapeStream } from "./client"

export interface SubmissionRow {
  [key: string]: Value
  id: string
  subject_id: string | null
  submitter_id: string
  submitter_type: string
  questionnaire_version_id: string
  gps_lat: string | null
  gps_lng: string | null
  created_at: string
  updated_at: string
}

export interface RiskClassificationRow {
  [key: string]: Value
  id: string
  submission_id: string
  sti_score: number
  sti_risk_level: string
  maternal_score: number | null
  maternal_risk_level: string | null
  community_wellbeing_score: number
  community_wellbeing_risk_level: string
  overall_risk_level: string
  aggregate_score: number
  classified_at: string
}

export interface IrixScoreRow {
  [key: string]: Value
  id: string
  geographic_unit_id: string
  overall_irix_score: string
  overall_risk_level: string
  sti_avg_score: string | null
  maternal_avg_score: string | null
  community_wellbeing_avg_score: string | null
  submission_count: number
  hotspot_flag: boolean
  computed_at: string
}

export function submissionsShape(submitterId?: string) {
  return new Shape(
    createShapeStream<SubmissionRow>(
      "submissions",
      submitterId ? `submitter_id = '${submitterId}'` : undefined,
    ),
  )
}

export function riskClassificationsShape(submissionId?: string) {
  return new Shape(
    createShapeStream<RiskClassificationRow>(
      "risk_classifications",
      submissionId ? `submission_id = '${submissionId}'` : undefined,
    ),
  )
}

export function irixScoresShape() {
  return new Shape(
    createShapeStream<IrixScoreRow>("irix_scores"),
  )
}
