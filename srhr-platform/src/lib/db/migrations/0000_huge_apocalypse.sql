CREATE TYPE "public"."alert_status" AS ENUM('pending', 'sent', 'opened', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('high_risk_individual', 'threshold_breach', 'climate_warning', 'scheduled_summary');--> statement-breakpoint
CREATE TYPE "public"."climate_validation_status" AS ENUM('pending', 'validated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."disease_group" AS ENUM('sti', 'maternal_health', 'community_wellbeing', 'medication_access', 'srhr_access');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single_choice', 'multiple_choice', 'numeric', 'yes_no', 'text');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."submitter_type" AS ENUM('field_worker', 'personal_user');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('personal_user', 'field_worker', 'partner', 'gis_analyst', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_worker_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_value" text NOT NULL,
	"issued_to" uuid,
	"issued_by" uuid NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "field_worker_codes_code_value_unique" UNIQUE("code_value")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'personal_user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid,
	"age_group" text,
	"sex" text,
	"phone_encrypted" text,
	"email_encrypted" text,
	"consent_given" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"status" "questionnaire_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"question_number" text NOT NULL,
	"text" text NOT NULL,
	"type" "question_type" NOT NULL,
	"score_weight" integer DEFAULT 0 NOT NULL,
	"disease_group" "disease_group",
	"conditional_logic" jsonb,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response_value" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"sti_score" integer NOT NULL,
	"sti_risk_level" "risk_level" NOT NULL,
	"maternal_score" integer,
	"maternal_risk_level" "risk_level",
	"community_wellbeing_score" integer NOT NULL,
	"community_wellbeing_risk_level" "risk_level" NOT NULL,
	"overall_risk_level" "risk_level" NOT NULL,
	"aggregate_score" integer NOT NULL,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"classified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"submitter_id" uuid NOT NULL,
	"submitter_type" "submitter_type" NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"gps_lat" numeric,
	"gps_lng" numeric,
	"client_submission_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_client_submission_id_unique" UNIQUE("client_submission_id")
);
--> statement-breakpoint
CREATE TABLE "geographic_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"level" text NOT NULL,
	"h3_index" text,
	"parent_id" uuid,
	"population" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"address" text,
	"gps_lat" numeric,
	"gps_lng" numeric,
	"services_offered" jsonb,
	"risk_levels_served" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "irix_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geographic_unit_id" uuid NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_version" text NOT NULL,
	"sti_avg_score" numeric,
	"sti_risk_level" "risk_level",
	"maternal_avg_score" numeric,
	"maternal_risk_level" "risk_level",
	"community_wellbeing_avg_score" numeric,
	"community_wellbeing_risk_level" "risk_level",
	"overall_irix_score" numeric NOT NULL,
	"overall_risk_level" "risk_level" NOT NULL,
	"submission_count" integer DEFAULT 0 NOT NULL,
	"hotspot_flag" boolean DEFAULT false NOT NULL,
	"confidence_lower" numeric,
	"confidence_upper" numeric,
	"filters_applied" jsonb
);
--> statement-breakpoint
CREATE TABLE "irix_trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geographic_unit_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"sti_avg_score" numeric,
	"maternal_avg_score" numeric,
	"community_wellbeing_avg_score" numeric,
	"overall_irix_score" numeric NOT NULL,
	"overall_risk_level" "risk_level" NOT NULL,
	"submission_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climate_datasets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"uploaded_by" uuid,
	"validation_status" "climate_validation_status" DEFAULT 'pending' NOT NULL,
	"coverage_area" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climate_risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geographic_unit_id" uuid NOT NULL,
	"disaster_type" text NOT NULL,
	"probability" numeric,
	"severity" "risk_level",
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "alert_type" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"geographic_unit_id" uuid,
	"risk_level" "risk_level" NOT NULL,
	"status" "alert_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"actioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_worker_codes" ADD CONSTRAINT "field_worker_codes_issued_to_users_id_fk" FOREIGN KEY ("issued_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_worker_codes" ADD CONSTRAINT "field_worker_codes_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_classifications" ADD CONSTRAINT "risk_classifications_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_questionnaire_version_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaires"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irix_scores" ADD CONSTRAINT "irix_scores_geographic_unit_id_geographic_units_id_fk" FOREIGN KEY ("geographic_unit_id") REFERENCES "public"."geographic_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irix_trends" ADD CONSTRAINT "irix_trends_geographic_unit_id_geographic_units_id_fk" FOREIGN KEY ("geographic_unit_id") REFERENCES "public"."geographic_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "climate_datasets" ADD CONSTRAINT "climate_datasets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "climate_risks" ADD CONSTRAINT "climate_risks_geographic_unit_id_geographic_units_id_fk" FOREIGN KEY ("geographic_unit_id") REFERENCES "public"."geographic_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_geographic_unit_id_geographic_units_id_fk" FOREIGN KEY ("geographic_unit_id") REFERENCES "public"."geographic_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;