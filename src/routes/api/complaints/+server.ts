import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { complaints, bookings } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { triggerPusher } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

const createSchema = z.object({
	bookingId: z.string().uuid().optional(),
	subject: z.string().min(3).max(150),
	description: z.string().min(10).max(2000)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role === 'admin') throw error(401, 'Sign in as a passenger or rider to report an issue.');

	const parsed = createSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid complaint.');
	const { bookingId, subject, description } = parsed.data;

	if (bookingId) {
		const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
		const owns =
			booking &&
			((locals.user.role === 'passenger' && booking.studentId === locals.user.id) ||
				(locals.user.role === 'rider' && booking.riderId === locals.user.id));
		if (!owns) throw error(403, 'That trip is not linked to your account.');
	}

	const [created] = await db
		.insert(complaints)
		.values({
			bookingId,
			filedByType: locals.user.role === 'passenger' ? 'student' : 'rider',
			filedById: locals.user.id,
			filedByName: locals.user.fullname,
			subject,
			description
		})
		.returning();

	await triggerPusher('admin', 'complaint-filed', { complaintId: created.id });

	return json({ complaint: created });
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Sign in to continue.');

	if (locals.user.role === 'admin') {
		const rows = await db.query.complaints.findMany({
			orderBy: desc(complaints.createdAt),
			with: { booking: { columns: { pickupLocation: true, destination: true, bookingTime: true } } }
		});
		return json({ complaints: rows });
	}

	const rows = await db.query.complaints.findMany({
		where: eq(complaints.filedById, locals.user.id),
		orderBy: desc(complaints.createdAt)
	});
	return json({ complaints: rows });
};
