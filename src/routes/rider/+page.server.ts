import { db } from '$lib/server/db';
import { bookings, bookingDeclines, riders } from '$lib/server/db/schema';
import { eq, desc, and, isNull, notInArray } from 'drizzle-orm';
import { haversineKm } from '$lib/utils/fare';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const riderId = locals.user!.id;

	const me = await db.query.riders.findFirst({ where: eq(riders.id, riderId) });

	// Get booking IDs this rider has declined
	const declinedRows = await db
		.select({ bookingId: bookingDeclines.bookingId })
		.from(bookingDeclines)
		.where(eq(bookingDeclines.riderId, riderId));
	const declinedIds = declinedRows.map((r) => r.bookingId);

	let available = await db.query.bookings.findMany({
		where: and(
			eq(bookings.bookingStatus, 'pending'),
			isNull(bookings.riderId),
			declinedIds.length > 0 ? notInArray(bookings.id, declinedIds) : undefined
		),
		orderBy: desc(bookings.bookingTime),
		with: { student: { columns: { fullname: true, phone: true } } }
	});

	// Nearest-driver matching (Chapter 3, 3.3.1-A-V): if we know this rider's last GPS fix, sort
	// their available requests by distance from them instead of just by recency.
	const myLat = me?.currentLat !== null && me?.currentLat !== undefined ? Number(me.currentLat) : null;
	const myLng = me?.currentLng !== null && me?.currentLng !== undefined ? Number(me.currentLng) : null;
	let availableWithDistance = available.map((b) => ({
		...b,
		distanceToRiderKm:
			myLat !== null && myLng !== null && b.pickupLat && b.pickupLng
				? haversineKm(myLat, myLng, Number(b.pickupLat), Number(b.pickupLng))
				: null
	}));
	if (myLat !== null && myLng !== null) {
		availableWithDistance = availableWithDistance.sort(
			(a, b) => (a.distanceToRiderKm ?? Infinity) - (b.distanceToRiderKm ?? Infinity)
		);
	}

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

	return { available: availableWithDistance, mine, todaysTrips: todaysTrips.length, todaysEarnings };
};