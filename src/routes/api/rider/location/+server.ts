import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const schema = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180)
});

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'rider') throw error(401, 'Riders only.');

	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) throw error(400, 'Invalid coordinates.');

	const { lat, lng } = parsed.data;

	await db
		.update(riders)
		.set({ currentLat: String(lat), currentLng: String(lng), lastLocationAt: new Date() })
		.where(eq(riders.id, locals.user.id));

	return json({ ok: true });
};
