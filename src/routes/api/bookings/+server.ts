import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bookings, payments } from '$lib/server/db/schema';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { estimateFare, haversineKm } from '$lib/utils/fare';
import { pusher } from '$lib/server/pusher';
import type { RequestHandler } from './$types';

const createSchema = z.object({
	pickupLocation: z.string().min(2),
	pickupLat: z.number(),
	pickupLng: z.number(),
	destination: z.string().min(2),
	destinationLat: z.number(),
	destinationLng: z.number()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'passenger') throw error(401, 'Sign in as a passenger to book a ride.');

	const body = await request.json();
	const parsed = createSchema.safeParse(body);
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid booking details.');

	const { pickupLocation, pickupLat, pickupLng, destination, destinationLat, destinationLng } =
		parsed.data;

	const distanceKm = haversineKm(pickupLat, pickupLng, destinationLat, destinationLng);
	const fare = estimateFare(distanceKm);

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
		method: 'cash',
		status: 'pending'
	});

	// notify all riders of a new available booking, and admin dashboard
	await Promise.all([
		pusher.trigger('available-bookings', 'new-booking', { bookingId: booking.id }),
		pusher.trigger('admin', 'booking-updated', { bookingId: booking.id })
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
			with: { rider: { columns: { id: true, fullname: true, phone: true, plateNumber: true, tricycleModel: true, tricycleColour: true, avgRating: true } } }
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
		with: { student: { columns: { id: true, fullname: true, phone: true, email: true } }, rider: { columns: { id: true, fullname: true, phone: true, plateNumber: true } } }
	});
	return json({ bookings: rows });
};