import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { locations } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CAMPUS_LOCATIONS } from '$lib/utils/fare';
import { logAdminAction } from '$lib/server/audit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const rows = await db.query.locations.findMany({ orderBy: asc(locations.name) });
	if (rows.length > 0) {
		return json({ locations: rows.map((l) => ({ id: l.id, name: l.name, lat: Number(l.lat), lng: Number(l.lng) })) });
	}
	// Table not seeded yet — fall back to the static list so booking still works.
	return json({ locations: CAMPUS_LOCATIONS.map((l) => ({ id: l.name, name: l.name, lat: l.lat, lng: l.lng })) });
};

const createSchema = z.object({
	name: z.string().min(2).max(100),
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const parsed = createSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid location.');

	const [created] = await db
		.insert(locations)
		.values({ name: parsed.data.name, lat: String(parsed.data.lat), lng: String(parsed.data.lng) })
		.returning();

	await logAdminAction({
		adminId: locals.user.id,
		adminName: locals.user.fullname,
		action: 'create_location',
		targetType: 'location',
		targetId: created.id,
		details: `Added "${created.name}"`
	});

	return json({ location: created });
};
