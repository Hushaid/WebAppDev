import { pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", [
  "personal_user",
  "field_worker",
  "partner",
  "gis_analyst",
  "admin",
  "super_admin",
])

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
])

export const submitterTypeEnum = pgEnum("submitter_type", [
  "field_worker",
  "personal_user",
])

export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
])

export const questionTypeEnum = pgEnum("question_type", [
  "single_choice",
  "multiple_choice",
  "numeric",
  "yes_no",
  "text",
])

export const diseaseGroupEnum = pgEnum("disease_group", [
  "sti",
  "maternal_health",
  "community_wellbeing",
  "medication_access",
  "srhr_access",
])

export const questionnaireStatusEnum = pgEnum("questionnaire_status", [
  "draft",
  "published",
  "archived",
])

export const alertTypeEnum = pgEnum("alert_type", [
  "high_risk_individual",
  "threshold_breach",
  "climate_warning",
  "scheduled_summary",
])

export const alertStatusEnum = pgEnum("alert_status", [
  "pending",
  "sent",
  "opened",
  "actioned",
  "dismissed",
])

export const climateValidationStatusEnum = pgEnum("climate_validation_status", [
  "pending",
  "validated",
  "rejected",
])
