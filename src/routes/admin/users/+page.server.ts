import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { riderVerificationRequests, riders } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const allRiders = await db.query.riders.findMany({
		columns: {
			id: true, fullname: true, email: true, phone: true, plateNumber: true, serialNumber: true,
			isVerified: true, isOnline: true, avgRating: true, totalTrips: true,
			totalEarnings: true, regDate: true
		}
	});
	const allStudents = await db.query.students.findMany({
		columns: { id: true, fullname: true, email: true, phone: true, regDate: true }
	});
	const requests = await db.select({
		id: riderVerificationRequests.id,
		riderId: riders.id,
		fullname: riders.fullname,
		email: riders.email,
		serialNumber: riders.serialNumber,
		plateNumber: riders.plateNumber,
		documentType: riderVerificationRequests.documentType,
		documentUrl: riderVerificationRequests.documentUrl,
		faceScanUrl: riderVerificationRequests.faceScanUrl,
		status: riderVerificationRequests.status,
		reviewNotes: riderVerificationRequests.reviewNotes,
		reviewedAt: riderVerificationRequests.reviewedAt,
		createdAt: riderVerificationRequests.createdAt
	}).from(riderVerificationRequests).innerJoin(riders, eq(riderVerificationRequests.riderId, riders.id))
		.orderBy(riderVerificationRequests.createdAt);
	return { riders: allRiders, students: allStudents, requests };
};
