import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { locations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logAdminAction } from '$lib/server/audit';
import type { RequestHandler } from './$types';

const updateSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	lat: z.number().min(-90).max(90).optional(),
	lng: z.number().min(-180).max(180).optional()
});

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const parsed = updateSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid location.');

	const { name, lat, lng } = parsed.data;
	const [updated] = await db
		.update(locations)
		.set({
			...(name !== undefined ? { name } : {}),
			...(lat !== undefined ? { lat: String(lat) } : {}),
			...(lng !== undefined ? { lng: String(lng) } : {})
		})
		.where(eq(locations.id, params.id))
		.returning();
	if (!updated) throw error(404, 'Location not found.');

	await logAdminAction({
		adminId: locals.user.id,
		adminName: locals.user.fullname,
		action: 'update_location',
		targetType: 'location',
		targetId: updated.id,
		details: `Updated "${updated.name}"`
	});

	return json({ location: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const existing = await db.query.locations.findFirst({ where: eq(locations.id, params.id) });
	if (!existing) throw error(404, 'Location not found.');

	await db.delete(locations).where(eq(locations.id, params.id));

	await logAdminAction({
		adminId: locals.user.id,
		adminName: locals.user.fullname,
		action: 'delete_location',
		targetType: 'location',
		targetId: params.id,
		details: `Removed "${existing.name}"`
	});

	return json({ ok: true });
};
