import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riderVerificationRequests, riders } from '$lib/server/db/schema';
import { and, eq, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const uploadThingUrl = z.string().url().max(1000).refine((value) => {
	const parsed = new URL(value);
	return parsed.protocol === 'https:' && (parsed.hostname === 'ufs.sh' || parsed.hostname.endsWith('.ufs.sh')) && parsed.pathname.startsWith('/f/');
}, 'Files must be uploaded to UploadThing.');

const schema = z.object({
	documentType: z.enum(['nin', 'drivers_license']),
	documentUrl: uploadThingUrl,
	faceScanUrl: uploadThingUrl,
	vehicleIdentifierType: z.enum(['plate', 'serial']).optional(),
	vehicleIdentifier: z.string().trim().min(2).max(50).optional()
}).superRefine((value, ctx) => {
	if (Boolean(value.vehicleIdentifierType) !== Boolean(value.vehicleIdentifier)) {
		ctx.addIssue({ code: 'custom', message: 'Provide both a vehicle number type and value.' });
	}
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
	if (existing?.status === 'pending') throw error(409, 'Your verification request is already under review.');
	const { vehicleIdentifierType, vehicleIdentifier, ...verificationData } = parsed.data;
	if (!rider.plateNumber && !rider.serialNumber && !vehicleIdentifier) {
		throw error(400, 'Add your plate or serial number before submitting verification.');
	}
	if (vehicleIdentifier && vehicleIdentifierType) {
		if (rider.plateNumber || rider.serialNumber) throw error(409, 'A vehicle number is already on file for this rider.');
		const normalizedIdentifier = vehicleIdentifier.toUpperCase();
		const existingIdentifier = await db.query.riders.findFirst({
			where: and(
				ne(riders.id, riderId),
				or(eq(riders.plateNumber, normalizedIdentifier), eq(riders.serialNumber, normalizedIdentifier))
			)
		});
		if (existingIdentifier) throw error(409, 'That plate or serial number is already registered to another rider.');
		await db.update(riders).set(vehicleIdentifierType === 'plate'
			? { plateNumber: normalizedIdentifier }
			: { serialNumber: normalizedIdentifier }
		).where(eq(riders.id, riderId));
	}
	if (existing) {
		await db.update(riderVerificationRequests).set({ ...verificationData, status: 'pending', reviewedBy: null, reviewedAt: null, reviewNotes: null, updatedAt: new Date() }).where(eq(riderVerificationRequests.riderId, riderId));
	} else {
		await db.insert(riderVerificationRequests).values({ riderId, ...verificationData });
	}
	return json({ ok: true });
};
