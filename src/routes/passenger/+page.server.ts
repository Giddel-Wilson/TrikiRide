import { db } from '$lib/server/db';
import { bookings } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db.query.bookings.findMany({
		where: eq(bookings.studentId, locals.user!.id),
		orderBy: desc(bookings.bookingTime),
		with: {
			rider: {
				columns: {
					id: true,
					fullname: true,
					phone: true,
					plateNumber: true,
					tricycleModel: true,
					tricycleColour: true,
					avgRating: true
				}
			}
		}
	});
	return { bookings: rows };
};
