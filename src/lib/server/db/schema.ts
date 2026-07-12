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

export const students = pgTable('students', {
	id: uuid('id').primaryKey().defaultRandom(),
	fullname: varchar('fullname', { length: 100 }).notNull(),
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
	licenceNumber: varchar('licence_number', { length: 50 }).notNull(),
	plateNumber: varchar('plate_number', { length: 20 }).notNull().unique(),
	tricycleModel: varchar('tricycle_model', { length: 100 }),
	tricycleColour: varchar('tricycle_colour', { length: 50 }),
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

export const studentsRelations = relations(students, ({ many }) => ({ bookings: many(bookings) }));
export const ridersRelations   = relations(riders,   ({ many }) => ({ bookings: many(bookings) }));
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
