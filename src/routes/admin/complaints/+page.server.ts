import { db } from '$lib/server/db';
import { complaints } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.query.complaints.findMany({
		orderBy: desc(complaints.createdAt),
		with: { booking: { columns: { pickupLocation: true, destination: true } } }
	});
	return { complaints: rows };
};
