import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'rider') {
		throw redirect(302, '/login?as=rider');
	}
	const rider = await db.query.riders.findFirst({
		where: eq(riders.id, locals.user.id),
		columns: {
			id: true, fullname: true, isOnline: true, isVerified: true,
			avgRating: true, totalTrips: true, totalEarnings: true, plateNumber: true
		}
	});
	return { user: locals.user, rider };
};