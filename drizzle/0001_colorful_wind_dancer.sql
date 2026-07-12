ALTER TYPE "public"."booking_status" ADD VALUE 'arrived_pickup' BEFORE 'ongoing';--> statement-breakpoint
CREATE TABLE "booking_declines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"declined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "arrived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "current_lat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "current_lng" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "last_location_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking_declines" ADD CONSTRAINT "booking_declines_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_declines" ADD CONSTRAINT "booking_declines_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;