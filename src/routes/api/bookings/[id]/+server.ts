import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bookings, riders, payments, bookingDeclines } from '$lib/server/db/schema';
import { eq, sql, and, isNull, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import { pusher } from '$lib/server/pusher';
import type { RequestHandler } from './$types';

const actionSchema = z.object({
	action: z.enum(['accept', 'decline', 'arrive', 'start', 'complete', 'cancel', 'rate']),
	rating: z.number().min(1).max(5).optional(),
	comment: z.string().max(500).optional(),
	paymentMethod: z.enum(['cash', 'wallet', 'transfer']).optional()
});

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) throw error(401, 'Sign in to continue.');

	const body = await request.json();
	const parsed = actionSchema.safeParse(body);
	if (!parsed.success) throw error(400, 'Invalid action.');
	const { action, rating, comment, paymentMethod } = parsed.data;

	const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, params.id) });
	if (!booking) throw error(404, 'Booking not found.');

	if (action === 'accept') {
    if (locals.user.role !== 'rider') throw error(403, 'Only riders can accept rides.');

    // Atomic conditional update — only succeeds if booking is still pending with no rider
    const [updated] = await db
        .update(bookings)
        .set({ riderId: locals.user.id, bookingStatus: 'accepted', acceptedAt: new Date() })
        .where(and(
            eq(bookings.id, params.id),
            eq(bookings.bookingStatus, 'pending'),
            isNull(bookings.riderId)
        ))
        .returning();

    // If nothing was returned, another rider just beat us to it
    if (!updated) throw error(409, 'This ride was just accepted by another rider.');

    await Promise.all([
        pusher.trigger(`passenger-${updated.studentId}`, 'booking-updated', { bookingId: params.id, status: 'accepted' }),
        pusher.trigger('available-bookings', 'booking-taken', { bookingId: params.id }),
        pusher.trigger('admin', 'booking-updated', { bookingId: params.id })
    ]);
    return json({ booking: updated });
}

	if (action === 'decline') {
		if (locals.user.role !== 'rider') throw error(403, 'Only riders can decline rides.');
		await db.insert(bookingDeclines).values({
			bookingId: params.id,
			riderId: locals.user.id
		}).onConflictDoNothing();
		// Only refresh the declining rider's own list — other riders still see the booking
		await pusher.trigger(`rider-${locals.user.id}`, 'booking-updated', { bookingId: params.id, status: 'declined' });
		return json({ ok: true });
	}

	if (action === 'arrive') {
		if (locals.user.role !== 'rider' || booking.riderId !== locals.user.id) throw error(403, 'Not your booking.');
		if (booking.bookingStatus !== 'accepted') throw error(409, 'Ride must be accepted first.');
		const [updated] = await db
			.update(bookings)
			.set({ bookingStatus: 'arrived_pickup', arrivedAt: new Date() })
			.where(eq(bookings.id, params.id))
			.returning();
		await Promise.all([
			pusher.trigger(`passenger-${booking.studentId}`, 'booking-updated', { bookingId: params.id, status: 'arrived_pickup' }),
			pusher.trigger('admin', 'booking-updated', { bookingId: params.id })
		]);
		return json({ booking: updated });
	}

	if (action === 'start') {
		if (locals.user.role !== 'rider' || booking.riderId !== locals.user.id) throw error(403, 'Not your booking.');
		if (booking.bookingStatus !== 'arrived_pickup') throw error(409, 'Rider must arrive at pickup first.');
		const [updated] = await db
			.update(bookings)
			.set({ bookingStatus: 'ongoing', startedAt: new Date() })
			.where(eq(bookings.id, params.id))
			.returning();
		await Promise.all([
			pusher.trigger(`passenger-${booking.studentId}`, 'booking-updated', { bookingId: params.id, status: 'ongoing' }),
			pusher.trigger('admin', 'booking-updated', { bookingId: params.id })
		]);
		return json({ booking: updated });
	}

	if (action === 'complete') {
		if (locals.user.role !== 'rider' || booking.riderId !== locals.user.id) throw error(403, 'Not your booking.');
		if (booking.bookingStatus !== 'ongoing') throw error(409, 'Ride must be ongoing first.');
		const [updated] = await db
			.update(bookings)
			.set({ bookingStatus: 'completed', completedAt: new Date() })
			.where(eq(bookings.id, params.id))
			.returning();
		await db.update(payments)
			.set({ status: 'successful', method: paymentMethod ?? 'cash', paidAt: new Date() })
			.where(eq(payments.bookingId, params.id));
		await db.update(riders)
			.set({ totalTrips: sql`${riders.totalTrips} + 1`, totalEarnings: sql`${riders.totalEarnings} + ${booking.fare}` })
			.where(eq(riders.id, locals.user.id));
		await Promise.all([
			pusher.trigger(`passenger-${booking.studentId}`, 'booking-updated', { bookingId: params.id, status: 'completed' }),
			pusher.trigger(`rider-${locals.user.id}`, 'booking-updated', { bookingId: params.id, status: 'completed' }),
			pusher.trigger('admin', 'booking-updated', { bookingId: params.id })
		]);
		return json({ booking: updated });
	}

	if (action === 'cancel') {
		const isOwner =
			(locals.user.role === 'passenger' && booking.studentId === locals.user.id) ||
			(locals.user.role === 'rider' && booking.riderId === locals.user.id) ||
			locals.user.role === 'admin';
		if (!isOwner) throw error(403, 'Not your booking.');
		if (booking.bookingStatus === 'completed') throw error(409, 'Completed rides cannot be cancelled.');
		const [updated] = await db
			.update(bookings)
			.set({ bookingStatus: 'cancelled', cancelledAt: new Date() })
			.where(eq(bookings.id, params.id))
			.returning();
		const triggers = [pusher.trigger('admin', 'booking-updated', { bookingId: params.id })];
		if (booking.studentId) triggers.push(pusher.trigger(`passenger-${booking.studentId}`, 'booking-updated', { bookingId: params.id, status: 'cancelled' }));
		if (booking.riderId)   triggers.push(pusher.trigger(`rider-${booking.riderId}`, 'booking-updated', { bookingId: params.id, status: 'cancelled' }));
		await Promise.all(triggers);
		return json({ booking: updated });
	}

	if (action === 'rate') {
		if (locals.user.role !== 'passenger' || booking.studentId !== locals.user.id) throw error(403, 'Not your booking.');
		if (booking.bookingStatus !== 'completed') throw error(409, 'You can only rate completed rides.');
		if (!rating) throw error(400, 'Rating is required.');
		const [updated] = await db
			.update(bookings)
			.set({ passengerRating: rating, passengerComment: comment })
			.where(eq(bookings.id, params.id))
			.returning();
		if (booking.riderId) {
			const rows = await db.query.bookings.findMany({ where: eq(bookings.riderId, booking.riderId) });
			const rated = rows.filter((r) => r.passengerRating != null);
			const avg = rated.reduce((s, r) => s + (r.passengerRating ?? 0), 0) / (rated.length || 1);
			await db.update(riders).set({ avgRating: avg.toFixed(2) }).where(eq(riders.id, booking.riderId));
			await pusher.trigger(`rider-${booking.riderId}`, 'booking-updated', { bookingId: params.id, status: 'rated' });
		}
		await pusher.trigger('admin', 'booking-updated', { bookingId: params.id });
		return json({ booking: updated });
	}

	throw error(400, 'Unknown action.');
};

export const GET: RequestHandler = async ({ locals, url, params }) => {
	if (!locals.user) throw error(401, 'Sign in to view bookings.');

	if (locals.user.role === 'rider') {
		const declinedRows = await db
			.select({ bookingId: bookingDeclines.bookingId })
			.from(bookingDeclines)
			.where(eq(bookingDeclines.riderId, locals.user.id));
		const declinedIds = declinedRows.map((r) => r.bookingId);

		const rows = await db.query.bookings.findMany({
			where: and(
				eq(bookings.bookingStatus, 'pending'),
				isNull(bookings.riderId),
				declinedIds.length > 0 ? notInArray(bookings.id, declinedIds) : undefined
			),
			orderBy: (b, { desc }) => [desc(b.bookingTime)],
			with: { student: { columns: { id: true, fullname: true, phone: true } } }
		});
		return json({ bookings: rows });
	}

	throw error(403, 'Forbidden.');
};