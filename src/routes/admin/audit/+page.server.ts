import { db } from '$lib/server/db';
import { adminAuditLog } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.query.adminAuditLog.findMany({
		orderBy: desc(adminAuditLog.createdAt),
		limit: 300
	});
	return { entries: rows };
};
