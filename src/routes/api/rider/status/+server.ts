import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'rider') throw error(401, 'Riders only.');
	const { isOnline } = await request.json();
	const [updated] = await db
		.update(riders)
		.set({ isOnline: Boolean(isOnline) })
		.where(eq(riders.id, locals.user.id))
		.returning();
	return json({ rider: updated });
};
