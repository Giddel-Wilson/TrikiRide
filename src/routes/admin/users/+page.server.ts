import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allRiders = await db.query.riders.findMany({
		columns: {
			id: true, fullname: true, email: true, phone: true, plateNumber: true,
			isVerified: true, isOnline: true, avgRating: true, totalTrips: true,
			totalEarnings: true, regDate: true
		}
	});
	const allStudents = await db.query.students.findMany({
		columns: { id: true, fullname: true, email: true, phone: true, regDate: true }
	});
	return { riders: allRiders, students: allStudents };
};
