import { db } from '$lib/server/db';
import { bookings } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.query.bookings.findMany({
		orderBy: desc(bookings.bookingTime),
		with: {
			student: { columns: { fullname: true } },
			rider: { columns: { fullname: true } }
		}
	});
	return { bookings: rows };
};