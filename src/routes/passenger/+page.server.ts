import { db } from '$lib/server/db';
import { bookings, locations } from '$lib/server/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getFareSettings } from '$lib/server/settings';
import { CAMPUS_LOCATIONS } from '$lib/utils/fare';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db.query.bookings.findMany({
		where: eq(bookings.studentId, locals.user!.id),
		orderBy: desc(bookings.bookingTime),
		with: {
			rider: {
				columns: {
					id: true,
					fullname: true,
					phone: true,
					plateNumber: true,
					serialNumber: true,
					tricycleModel: true,
					tricycleColour: true,
					profilePhotoUrl: true,
					avgRating: true
				}
			}
		}
	});

	const dbLocations = await db.query.locations.findMany({ orderBy: asc(locations.name) });
	const campusLocations = dbLocations.length > 0
		? dbLocations.map((l) => ({ name: l.name, lat: Number(l.lat), lng: Number(l.lng) }))
		: CAMPUS_LOCATIONS;

	return { bookings: rows, campusLocations, fareSettings: await getFareSettings() };
};
