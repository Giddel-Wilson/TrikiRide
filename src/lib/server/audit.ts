import { db } from '$lib/server/db';
import { adminAuditLog } from '$lib/server/db/schema';

/**
 * Records one entry in the administrative audit log (Chapter 3, 3.3.1-C-vi).
 * Fire-and-forget from the caller's point of view — a logging failure should
 * never block the admin action itself, so errors are swallowed and logged
 * to the server console instead of being thrown.
 */
export async function logAdminAction(params: {
	adminId: string;
	adminName: string;
	action: string;
	targetType: string;
	targetId?: string;
	details?: string;
}) {
	try {
		await db.insert(adminAuditLog).values({
			adminId: params.adminId,
			adminName: params.adminName,
			action: params.action,
			targetType: params.targetType,
			targetId: params.targetId,
			details: params.details
		});
	} catch (e) {
		console.error('Failed to write admin audit log entry:', e);
	}
}
