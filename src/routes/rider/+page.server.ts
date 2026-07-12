import { db } from '$lib/server/db';
import { bookings, bookingDeclines } from '$lib/server/db/schema';
import { eq, desc, and, isNull, notInArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const riderId = locals.user!.id;

	// Get booking IDs this rider has declined
	const declinedRows = await db
		.select({ bookingId: bookingDeclines.bookingId })
		.from(bookingDeclines)
		.where(eq(bookingDeclines.riderId, riderId));
	const declinedIds = declinedRows.map((r) => r.bookingId);

	const available = await db.query.bookings.findMany({
		where: and(
			eq(bookings.bookingStatus, 'pending'),
			isNull(bookings.riderId),
			declinedIds.length > 0 ? notInArray(bookings.id, declinedIds) : undefined
		),
		orderBy: desc(bookings.bookingTime),
		with: { student: { columns: { fullname: true, phone: true } } }
	});

	const mine = await db.query.bookings.findMany({
		where: eq(bookings.riderId, riderId),
		orderBy: desc(bookings.bookingTime),
		with: { student: { columns: { fullname: true, phone: true } } }
	});

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todaysTrips = mine.filter(
		(b) => b.bookingStatus === 'completed' && new Date(b.bookingTime) >= today
	);
	const todaysEarnings = todaysTrips.reduce((sum, b) => sum + Number(b.fare), 0);

	return { available, mine, todaysTrips: todaysTrips.length, todaysEarnings };
};