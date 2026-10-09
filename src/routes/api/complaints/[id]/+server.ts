import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { complaints } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logAdminAction } from '$lib/server/audit';
import type { RequestHandler } from './$types';

const actionSchema = z.object({
	status: z.enum(['resolved', 'dismissed']),
	adminResponse: z.string().max(2000).optional()
});

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const parsed = actionSchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, parsed.error.issues[0]?.message ?? 'Invalid request.');
	const { status, adminResponse } = parsed.data;

	const [updated] = await db
		.update(complaints)
		.set({ status, adminResponse, resolvedAt: new Date() })
		.where(eq(complaints.id, params.id))
		.returning();
	if (!updated) throw error(404, 'Complaint not found.');

	await logAdminAction({
		adminId: locals.user.id,
		adminName: locals.user.fullname,
		action: status === 'resolved' ? 'resolve_complaint' : 'dismiss_complaint',
		targetType: 'complaint',
		targetId: updated.id,
		details: updated.subject
	});

	return json({ complaint: updated });
};
