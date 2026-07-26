import { db } from '$lib/server/db';
import { locations } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.query.locations.findMany({ orderBy: asc(locations.name) });
	return { locations: rows };
};
