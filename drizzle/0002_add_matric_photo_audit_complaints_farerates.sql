CREATE TYPE "public"."complainant_type" AS ENUM('student', 'rider');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"admin_name" varchar(100) NOT NULL,
	"action" varchar(60) NOT NULL,
	"target_type" varchar(30) NOT NULL,
	"target_id" varchar(100),
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"filed_by_type" "complainant_type" NOT NULL,
	"filed_by_id" uuid NOT NULL,
	"filed_by_name" varchar(100) NOT NULL,
	"subject" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"admin_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fare_settings" (
	"id" varchar(20) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"base_fare" numeric(8, 2) DEFAULT '200.00' NOT NULL,
	"rate_per_km" numeric(8, 2) DEFAULT '80.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "profile_photo_url" varchar(500);--> statement-breakpoint
-- Added nullable first so this migration is safe to run against a database that already has student rows
-- (existing rows get a placeholder "UNSET-<short id>" value you should ask those students to update).
-- If you're running this against a fresh/empty database, the UPDATE below is a no-op.
ALTER TABLE "students" ADD COLUMN "matric_no" varchar(20);--> statement-breakpoint
UPDATE "students" SET "matric_no" = 'UNSET-' || substr("id"::text, 1, 8) WHERE "matric_no" IS NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "matric_no" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fare_settings" ADD CONSTRAINT "fare_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_matric_no_unique" UNIQUE("matric_no");--> statement-breakpoint
INSERT INTO "fare_settings" ("id") VALUES ('default') ON CONFLICT DO NOTHING;