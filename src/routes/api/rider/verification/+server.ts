import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riderVerificationRequests, riders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const uploadThingUrl = z.string().url().max(1000).refine((value) => {
	const parsed = new URL(value);
	return parsed.protocol === 'https:' && (parsed.hostname === 'ufs.sh' || parsed.hostname.endsWith('.ufs.sh')) && parsed.pathname.startsWith('/f/');
}, 'Files must be uploaded to UploadThing.');

const schema = z.object({
	documentType: z.enum(['nin', 'drivers_license']),
	documentUrl: uploadThingUrl,
	faceScanUrl: uploadThingUrl
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user?.role !== 'rider') throw error(403, 'Riders only.');
	const parsed = schema.safeParse(await request.json());
	if (!parsed.success) throw error(400, 'Provide an identity document and face scan.');
	const riderId = locals.user.id;
	const rider = await db.query.riders.findFirst({ where: eq(riders.id, riderId) });
	if (!rider) throw error(404, 'Rider not found.');
	if (rider.isVerified) throw error(409, 'Your account is already verified.');
	const existing = await db.query.riderVerificationRequests.findFirst({ where: eq(riderVerificationRequests.riderId, riderId) });
	if (existing) {
		if (existing.status === 'pending') throw error(409, 'Your verification request is already under review.');
		await db.update(riderVerificationRequests).set({ ...parsed.data, status: 'pending', reviewedBy: null, reviewedAt: null, reviewNotes: null, updatedAt: new Date() }).where(eq(riderVerificationRequests.riderId, riderId));
	} else {
		await db.insert(riderVerificationRequests).values({ riderId, ...parsed.data });
	}
	return json({ ok: true });
};
