import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fareSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getFareSettings } from '$lib/server/settings';
import { logAdminAction } from '$lib/server/audit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	return json(await getFareSettings());
};

const updateSchema = z.object({
	baseFare: z.number().min(0).max(100000),
	ratePerKm: z.number().min(0).max(100000)
});

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const parsed = updateSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid fare settings.');
	const { baseFare, ratePerKm } = parsed.data;

	// Ensure the singleton row exists, then update it.
	await getFareSettings();
	const [updated] = await db
		.update(fareSettings)
		.set({ baseFare: String(baseFare), ratePerKm: String(ratePerKm), updatedAt: new Date(), updatedBy: locals.user.id })
		.where(eq(fareSettings.id, 'default'))
		.returning();

	await logAdminAction({
		adminId: locals.user.id,
		adminName: locals.user.fullname,
		action: 'update_fare_settings',
		targetType: 'fare_settings',
		details: `Base fare ₦${baseFare}, rate ₦${ratePerKm}/km`
	});

	return json({ baseFare: Number(updated.baseFare), ratePerKm: Number(updated.ratePerKm) });
};
