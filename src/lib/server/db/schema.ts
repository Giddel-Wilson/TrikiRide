import {
	pgTable, uuid, varchar, text, timestamp, numeric,
	boolean, pgEnum, integer
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const bookingStatusEnum = pgEnum('booking_status', [
	'pending', 'accepted', 'arrived_pickup', 'ongoing', 'completed', 'cancelled'
]);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'wallet', 'transfer']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'successful', 'failed']);
export const complainantTypeEnum = pgEnum('complainant_type', ['student', 'rider']);
export const complaintStatusEnum = pgEnum('complaint_status', ['open', 'resolved', 'dismissed']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'approved', 'declined']);
export const identityDocumentEnum = pgEnum('identity_document_type', ['nin', 'drivers_license']);

export const students = pgTable('students', {
	id: uuid('id').primaryKey().defaultRandom(),
	fullname: varchar('fullname', { length: 100 }).notNull(),
	// UNIPORT matriculation number, e.g. "U2022/5570155" — ties an account to a verified student (Chapter 3, 3.4.1)
	matricNo: varchar('matric_no', { length: 20 }).notNull().unique(),
	email: varchar('email', { length: 100 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	phone: varchar('phone', { length: 15 }).notNull(),
	profilePhoto: varchar('profile_photo', { length: 255 }),
	regDate: timestamp('reg_date', { withTimezone: true }).notNull().defaultNow()
});

export const riders = pgTable('riders', {
	id: uuid('id').primaryKey().defaultRandom(),
	fullname: varchar('fullname', { length: 100 }).notNull(),
	email: varchar('email', { length: 100 }).notNull().unique(),
	phone: varchar('phone', { length: 15 }).notNull(),
	plateNumber: varchar('plate_number', { length: 30 }).unique(),
	serialNumber: varchar('serial_number', { length: 50 }).unique(),
	tricycleModel: varchar('tricycle_model', { length: 100 }),
	tricycleColour: varchar('tricycle_colour', { length: 50 }),
	// Optional photo URL shown to passengers when matched (Chapter 3, 3.3.1-A-V) — no upload storage is
	// configured for this project, so riders paste a hosted image URL rather than uploading a file directly.
	profilePhotoUrl: varchar('profile_photo_url', { length: 500 }),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	isVerified: boolean('is_verified').notNull().default(false),
	isOnline: boolean('is_online').notNull().default(false),
	avgRating: numeric('avg_rating', { precision: 3, scale: 2 }).notNull().default('5.00'),
	totalTrips: integer('total_trips').notNull().default(0),
	totalEarnings: numeric('total_earnings', { precision: 10, scale: 2 }).notNull().default('0.00'),
	// Live GPS — updated every few seconds when on an active trip
	currentLat: numeric('current_lat', { precision: 9, scale: 6 }),
	currentLng: numeric('current_lng', { precision: 9, scale: 6 }),
	lastLocationAt: timestamp('last_location_at', { withTimezone: true }),
	regDate: timestamp('reg_date', { withTimezone: true }).notNull().defaultNow()
});

export const riderVerificationRequests = pgTable('rider_verification_requests', {
	id: uuid('id').primaryKey().defaultRandom(),
	riderId: uuid('rider_id').notNull().unique().references(() => riders.id, { onDelete: 'cascade' }),
	documentType: identityDocumentEnum('document_type').notNull(),
	documentUrl: varchar('document_url', { length: 1000 }).notNull(),
	faceScanUrl: varchar('face_scan_url', { length: 1000 }).notNull(),
	status: verificationStatusEnum('status').notNull().default('pending'),
	reviewedBy: uuid('reviewed_by').references(() => admins.id, { onDelete: 'set null' }),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
	reviewNotes: text('review_notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const locations = pgTable('locations', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 100 }).notNull(),
	lat: numeric('lat', { precision: 9, scale: 6 }).notNull(),
	lng: numeric('lng', { precision: 9, scale: 6 }).notNull()
});

export const admins = pgTable('admins', {
	id: uuid('id').primaryKey().defaultRandom(),
	fullname: varchar('fullname', { length: 100 }).notNull(),
	email: varchar('email', { length: 100 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	regDate: timestamp('reg_date', { withTimezone: true }).notNull().defaultNow()
});

export const bookings = pgTable('bookings', {
	id: uuid('id').primaryKey().defaultRandom(),
	studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
	riderId: uuid('rider_id').references(() => riders.id, { onDelete: 'set null' }),
	pickupLocation: varchar('pickup_location', { length: 100 }).notNull(),
	pickupLat: numeric('pickup_lat', { precision: 9, scale: 6 }),
	pickupLng: numeric('pickup_lng', { precision: 9, scale: 6 }),
	destination: varchar('destination', { length: 100 }).notNull(),
	destinationLat: numeric('destination_lat', { precision: 9, scale: 6 }),
	destinationLng: numeric('destination_lng', { precision: 9, scale: 6 }),
	distanceKm: numeric('distance_km', { precision: 6, scale: 2 }),
	fare: numeric('fare', { precision: 8, scale: 2 }).notNull(),
	bookingStatus: bookingStatusEnum('booking_status').notNull().default('pending'),
	passengerRating: integer('passenger_rating'),
	passengerComment: text('passenger_comment'),
	riderRating: integer('rider_rating'),
	bookingTime: timestamp('booking_time', { withTimezone: true }).notNull().defaultNow(),
	acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	arrivedAt: timestamp('arrived_at', { withTimezone: true }),
	startedAt: timestamp('started_at', { withTimezone: true }),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	cancelledAt: timestamp('cancelled_at', { withTimezone: true })
});

export const payments = pgTable('payments', {
	id: uuid('id').primaryKey().defaultRandom(),
	bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
	amount: numeric('amount', { precision: 8, scale: 2 }).notNull(),
	method: paymentMethodEnum('method').notNull().default('cash'),
	status: paymentStatusEnum('status').notNull().default('pending'),
	paidAt: timestamp('paid_at', { withTimezone: true })
});

export const bookingDeclines = pgTable('booking_declines', {
	id: uuid('id').defaultRandom().primaryKey(),
	bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
	riderId: uuid('rider_id').notNull().references(() => riders.id, { onDelete: 'cascade' }),
	declinedAt: timestamp('declined_at', { withTimezone: true }).notNull().defaultNow()
});

// Audit trail of administrative actions (Chapter 3, 3.3.1-C-vi)
export const adminAuditLog = pgTable('admin_audit_log', {
	id: uuid('id').primaryKey().defaultRandom(),
	adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
	adminName: varchar('admin_name', { length: 100 }).notNull(),
	action: varchar('action', { length: 60 }).notNull(),
	targetType: varchar('target_type', { length: 30 }).notNull(),
	targetId: varchar('target_id', { length: 100 }),
	details: text('details'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Passenger/rider complaints & disputes, reviewed and resolved by an admin (Chapter 3, 3.3.1-C-v)
export const complaints = pgTable('complaints', {
	id: uuid('id').primaryKey().defaultRandom(),
	bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
	filedByType: complainantTypeEnum('filed_by_type').notNull(),
	filedById: uuid('filed_by_id').notNull(),
	filedByName: varchar('filed_by_name', { length: 100 }).notNull(),
	subject: varchar('subject', { length: 150 }).notNull(),
	description: text('description').notNull(),
	status: complaintStatusEnum('status').notNull().default('open'),
	adminResponse: text('admin_response'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	resolvedAt: timestamp('resolved_at', { withTimezone: true })
});

// Single-row, admin-configurable fare settings — replaces the hardcoded constants in utils/fare.ts
// (Chapter 3, 3.3.1-C-ii: "set and update the base fare and per-kilometre rate")
export const fareSettings = pgTable('fare_settings', {
	id: varchar('id', { length: 20 }).primaryKey().default('default'),
	baseFare: numeric('base_fare', { precision: 8, scale: 2 }).notNull().default('200.00'),
	ratePerKm: numeric('rate_per_km', { precision: 8, scale: 2 }).notNull().default('80.00'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	updatedBy: uuid('updated_by').references(() => admins.id, { onDelete: 'set null' })
});

export const studentsRelations = relations(students, ({ many }) => ({ bookings: many(bookings) }));
export const ridersRelations   = relations(riders,   ({ many, one }) => ({ bookings: many(bookings), verificationRequest: one(riderVerificationRequests) }));
export const riderVerificationRequestsRelations = relations(riderVerificationRequests, ({ one }) => ({
	rider: one(riders, { fields: [riderVerificationRequests.riderId], references: [riders.id] }),
	admin: one(admins, { fields: [riderVerificationRequests.reviewedBy], references: [admins.id] })
}));
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
	student:  one(students,       { fields: [bookings.studentId], references: [students.id] }),
	rider:    one(riders,         { fields: [bookings.riderId],   references: [riders.id]   }),
	payment:  many(payments),
	declines: many(bookingDeclines)
}));

export const bookingDeclinesRelations = relations(bookingDeclines, ({ one }) => ({
	booking: one(bookings, { fields: [bookingDeclines.bookingId], references: [bookings.id] }),
	rider:   one(riders,   { fields: [bookingDeclines.riderId],   references: [riders.id]   })
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
	booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] })
}));

export const complaintsRelations = relations(complaints, ({ one }) => ({
	booking: one(bookings, { fields: [complaints.bookingId], references: [bookings.id] })
}));
