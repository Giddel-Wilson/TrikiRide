ALTER TABLE "riders" DROP CONSTRAINT "riders_plate_number_unique";--> statement-breakpoint
ALTER TABLE "riders" RENAME COLUMN "plate_number" TO "serial_number";--> statement-breakpoint
ALTER TABLE "riders" ALTER COLUMN "serial_number" TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "riders" DROP COLUMN "licence_number";--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_serial_number_unique" UNIQUE("serial_number");--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."identity_document_type" AS ENUM('nin', 'drivers_license');--> statement-breakpoint
CREATE TABLE "rider_verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"document_type" "identity_document_type" NOT NULL,
	"document_url" varchar(1000) NOT NULL,
	"face_scan_url" varchar(1000) NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rider_verification_requests_rider_id_unique" UNIQUE("rider_id")
);--> statement-breakpoint
ALTER TABLE "rider_verification_requests" ADD CONSTRAINT "rider_verification_requests_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_verification_requests" ADD CONSTRAINT "rider_verification_requests_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
