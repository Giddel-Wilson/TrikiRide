ALTER TABLE "riders" ALTER COLUMN "serial_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "plate_number" varchar(30);--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_plate_number_unique" UNIQUE("plate_number");
