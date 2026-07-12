import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riders, students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');

	const allRiders = await db.query.riders.findMany({
		columns: {
			id: true,
			fullname: true,
			email: true,
			phone: true,
			plateNumber: true,
			isVerified: true,
			isOnline: true,
			avgRating: true,
			totalTrips: true,
			totalEarnings: true,
			regDate: true
		}
	});
	const allStudents = await db.query.students.findMany({
		columns: { id: true, fullname: true, email: true, phone: true, regDate: true }
	});

	return json({ riders: allRiders, students: allStudents });
};

const patchSchema = z.object({
	userType: z.enum(['rider', 'passenger']),
	id: z.string().uuid(),
	action: z.enum(['verify', 'suspend', 'delete'])
});

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');

	const parsed = patchSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, 'Invalid request.');
	const { userType, id, action } = parsed.data;

	if (action === 'delete') {
		if (userType === 'rider') await db.delete(riders).where(eq(riders.id, id));
		else await db.delete(students).where(eq(students.id, id));
		return json({ ok: true });
	}

	if (userType === 'rider') {
		const [updated] = await db
			.update(riders)
			.set({ isVerified: action === 'verify' ? true : false })
			.where(eq(riders.id, id))
			.returning();
		return json({ rider: updated });
	}

	return json({ ok: true });
};
