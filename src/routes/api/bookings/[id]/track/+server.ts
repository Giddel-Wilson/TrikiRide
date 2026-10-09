import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bookings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Lightweight polling endpoint — passenger calls this every 5s to get rider's live GPS
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Sign in to continue.');

	const booking = await db.query.bookings.findFirst({
		where: eq(bookings.id, params.id),
		with: {
			rider: {
				columns: {
					id: true,
					currentLat: true,
					currentLng: true,
					lastLocationAt: true
				}
			}
		}
	});

	if (!booking) throw error(404, 'Booking not found.');

	// Only the passenger or rider of this booking may poll
	const isOwner =
		(locals.user.role === 'passenger' && booking.studentId === locals.user.id) ||
		(locals.user.role === 'rider'     && booking.riderId    === locals.user.id) ||
		locals.user.role === 'admin';
	if (!isOwner) throw error(403, 'Not your booking.');

	return json({
		bookingStatus: booking.bookingStatus,
		riderLat: booking.rider?.currentLat ?? null,
		riderLng: booking.rider?.currentLng ?? null,
		lastLocationAt: booking.rider?.lastLocationAt ?? null
	});
};
