import { db } from '$lib/server/db';
import { bookings, students, riders } from '$lib/server/db/schema';
import { gte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const RANGE_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, all: null };

export const load: PageServerLoad = async ({ url }) => {
	const range = url.searchParams.get('range') ?? '30d';
	const days = RANGE_DAYS[range] ?? 30;
	const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : new Date(0);

	const [bookingsInRange, allStudents, allRiders] = await Promise.all([
		db.query.bookings.findMany({
			where: gte(bookings.bookingTime, since),
			with: { student: { columns: { fullname: true } }, rider: { columns: { fullname: true } } }
		}),
		db.query.students.findMany({ columns: { id: true, regDate: true } }),
		db.query.riders.findMany({ columns: { id: true, regDate: true } })
	]);

	const completed = bookingsInRange.filter((b) => b.bookingStatus === 'completed');
	const cancelled = bookingsInRange.filter((b) => b.bookingStatus === 'cancelled');
	const totalRevenue = completed.reduce((s, b) => s + Number(b.fare), 0);
	const avgFare = completed.length > 0 ? totalRevenue / completed.length : 0;

	const newStudents = allStudents.filter((s) => new Date(s.regDate) >= since).length;
	const newRiders = allRiders.filter((r) => new Date(r.regDate) >= since).length;

	// Daily breakdown for the table/export
	const byDay = new Map<string, { bookings: number; completed: number; revenue: number }>();
	for (const b of bookingsInRange) {
		const day = new Date(b.bookingTime).toISOString().slice(0, 10);
		const row = byDay.get(day) ?? { bookings: 0, completed: 0, revenue: 0 };
		row.bookings += 1;
		if (b.bookingStatus === 'completed') { row.completed += 1; row.revenue += Number(b.fare); }
		byDay.set(day, row);
	}
	const daily = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, v]) => ({ day, ...v }));

	return {
		range,
		totals: {
			bookings: bookingsInRange.length,
			completed: completed.length,
			cancelled: cancelled.length,
			totalRevenue,
			avgFare,
			newStudents,
			newRiders
		},
		daily
	};
};
