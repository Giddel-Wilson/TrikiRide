import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bookings, payments, riders } from '$lib/server/db/schema';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { estimateFare, haversineKm } from '$lib/utils/fare';
import { getFareSettings } from '$lib/server/settings';
import { triggerPusher } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

const createSchema = z.object({
	pickupLocation: z.string().min(2),
	pickupLat: z.number(),
	pickupLng: z.number(),
	destination: z.string().min(2),
	destinationLat: z.number(),
	destinationLng: z.number(),
	paymentMethod: z.enum(['cash', 'wallet', 'transfer']).optional()
});

// How close an online rider's last-known position must be to the pickup point to count as "nearby"
// for a priority notification (Chapter 3, 3.3.1-B-II: "notify a driver of new ride requests within
// their vicinity"). Generous for a campus-scale system where most riders are within a couple of km.
const VICINITY_RADIUS_KM = 3;
const NEARBY_RIDER_LIMIT = 3;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'passenger') throw error(401, 'Sign in as a passenger to book a ride.');

	const body = await request.json();
	const parsed = createSchema.safeParse(body);
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid booking details.');

	const { pickupLocation, pickupLat, pickupLng, destination, destinationLat, destinationLng, paymentMethod } =
		parsed.data;

	const distanceKm = haversineKm(pickupLat, pickupLng, destinationLat, destinationLng);
	const { baseFare, ratePerKm } = await getFareSettings();
	const fare = estimateFare(distanceKm, baseFare, ratePerKm);

	const [booking] = await db
		.insert(bookings)
		.values({
			studentId: locals.user.id,
			pickupLocation,
			pickupLat: String(pickupLat),
			pickupLng: String(pickupLng),
			destination,
			destinationLat: String(destinationLat),
			destinationLng: String(destinationLng),
			distanceKm: distanceKm.toFixed(2),
			fare: String(fare),
			bookingStatus: 'pending'
		})
		.returning();

	await db.insert(payments).values({
		bookingId: booking.id,
		amount: String(fare),
		method: paymentMethod ?? 'cash',
		status: 'pending'
	});

	// Find nearby online, verified riders (nearest-driver matching — Chapter 3, 3.3.1-A-V / 3.3.1-B-II).
	// Every online rider still sees this booking in their list (below), so a rider outside the radius or
	// without a live GPS fix yet can still pick it up — this only decides who gets the priority "near you"
	// nudge, it never excludes anyone from being able to accept.
	const onlineRiders = await db.query.riders.findMany({
		where: and(eq(riders.isOnline, true), eq(riders.isVerified, true))
	});
	const nearby = onlineRiders
		.filter((r) => r.currentLat !== null && r.currentLng !== null)
		.map((r) => ({ id: r.id, distanceKm: haversineKm(pickupLat, pickupLng, Number(r.currentLat), Number(r.currentLng)) }))
		.filter((r) => r.distanceKm <= VICINITY_RADIUS_KM)
		.sort((a, b) => a.distanceKm - b.distanceKm)
		.slice(0, NEARBY_RIDER_LIMIT);

	// notify all online riders of a new available booking (safety net), the nearest few with priority, and the admin dashboard
	await Promise.all([
		triggerPusher('available-bookings', 'new-booking', { bookingId: booking.id }),
		triggerPusher('admin', 'booking-updated', { bookingId: booking.id }),
		...nearby.map((r) =>
			triggerPusher(`rider-${r.id}`, 'nearby-booking', { bookingId: booking.id, distanceKm: r.distanceKm })
		)
	]);

	return json({ booking });
};

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) throw error(401, 'Sign in to view bookings.');

	const scope = url.searchParams.get('scope');

	if (locals.user.role === 'passenger') {
		const rows = await db.query.bookings.findMany({
			where: eq(bookings.studentId, locals.user.id),
			orderBy: desc(bookings.bookingTime),
			with: { rider: { columns: { id: true, fullname: true, phone: true, plateNumber: true, serialNumber: true, tricycleModel: true, tricycleColour: true, avgRating: true } } }
		});
		return json({ bookings: rows });
	}

	if (locals.user.role === 'rider') {
		if (scope === 'available') {
			const rows = await db.query.bookings.findMany({
				where: and(eq(bookings.bookingStatus, 'pending'), isNull(bookings.riderId)),
				orderBy: desc(bookings.bookingTime),
				with: { student: { columns: { id: true, fullname: true, phone: true } } }
			});
			return json({ bookings: rows });
		}
		const rows = await db.query.bookings.findMany({
			where: eq(bookings.riderId, locals.user.id),
			orderBy: desc(bookings.bookingTime),
			with: { student: { columns: { id: true, fullname: true, phone: true } } }
		});
		return json({ bookings: rows });
	}

	// admin — all bookings
	const rows = await db.query.bookings.findMany({
		orderBy: desc(bookings.bookingTime),
		with: { student: { columns: { id: true, fullname: true, phone: true, email: true } }, rider: { columns: { id: true, fullname: true, phone: true, plateNumber: true, serialNumber: true } } }
	});
	return json({ bookings: rows });
};
