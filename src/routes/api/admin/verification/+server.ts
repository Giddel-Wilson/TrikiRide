import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riderVerificationRequests, riders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logAdminAction } from '$lib/server/audit';
import type { RequestHandler } from './$types';
import { UTApi } from 'uploadthing/server';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const requestId = url.searchParams.get('requestId');
	const file = url.searchParams.get('file');
	if (!requestId || (file !== 'document' && file !== 'face')) throw error(400, 'Invalid file request.');
	const verification = await db.query.riderVerificationRequests.findFirst({ where: eq(riderVerificationRequests.id, requestId) });
	if (!verification) throw error(404, 'Verification request not found.');
	const fileUrl = file === 'document' ? verification.documentUrl : verification.faceScanUrl;
	const fileKey = new URL(fileUrl).pathname.split('/').filter(Boolean).at(-1);
	if (!fileKey) throw error(404, 'Uploaded file not found.');
	const signed = await new UTApi({ token: env.UPLOADTHING_TOKEN }).generateSignedURL(fileKey, { expiresIn: 300 });
	return new Response(null, { status: 302, headers: { location: signed.ufsUrl, 'cache-control': 'no-store' } });
};

const schema = z.object({ requestId: z.string().uuid(), decision: z.enum(['approved', 'declined']), reviewNotes: z.string().max(1000).optional() });

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'admin') throw error(403, 'Admins only.');
	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) throw error(400, 'Invalid review request.');
	const { requestId, decision, reviewNotes } = parsed.data;
	const verification = await db.query.riderVerificationRequests.findFirst({ where: eq(riderVerificationRequests.id, requestId) });
	if (!verification || verification.status !== 'pending') throw error(404, 'Pending verification request not found.');
	const [updated] = await db.update(riderVerificationRequests).set({
		status: decision, reviewedBy: locals.user.id, reviewedAt: new Date(), reviewNotes: reviewNotes || null, updatedAt: new Date()
	}).where(eq(riderVerificationRequests.id, requestId)).returning();
	await db.update(riders).set({ isVerified: decision === 'approved' }).where(eq(riders.id, verification.riderId));
	await logAdminAction({ adminId: locals.user.id, adminName: locals.user.fullname, action: decision === 'approved' ? 'approve_rider_verification' : 'decline_rider_verification', targetType: 'rider', targetId: verification.riderId, details: reviewNotes || undefined });
	return json({ request: updated });
};
