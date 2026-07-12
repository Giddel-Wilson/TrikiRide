import { db } from '$lib/server/db';
import { bookings, students, riders } from '$lib/server/db/schema';
import { desc, gte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const allBookings = await db.query.bookings.findMany({
			orderBy: desc(bookings.bookingTime),
			limit: 10,
			with: {
				student: { columns: { fullname: true } },
				rider: { columns: { fullname: true } }
			}
		});
	} catch (e: any) {
		console.error('=== REAL ERROR ===', e.cause ?? e);
		throw e;
	}

	const allBookings = await db.query.bookings.findMany({
		orderBy: desc(bookings.bookingTime),
		limit: 10,
		with: {
			student: { columns: { fullname: true } },
			rider: { columns: { fullname: true } }
		}
	});

	const allStudents = await db.query.students.findMany({ columns: { id: true } });
	const allRiders = await db.query.riders.findMany({ columns: { id: true, isOnline: true } });

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const fullBookings = await db.query.bookings.findMany({ where: gte(bookings.bookingTime, today) });
	const revenueToday = fullBookings
		.filter((b) => b.bookingStatus === 'completed')
		.reduce((s, b) => s + Number(b.fare), 0);

	const weekAgo = new Date();
	weekAgo.setDate(weekAgo.getDate() - 6);
	weekAgo.setHours(0, 0, 0, 0);
	const weekBookings = await db.query.bookings.findMany({ where: gte(bookings.bookingTime, weekAgo) });

	const days: { label: string; count: number }[] = [];
	for (let i = 6; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		d.setHours(0, 0, 0, 0);
		const next = new Date(d);
		next.setDate(next.getDate() + 1);
		const count = weekBookings.filter((b) => {
			const t = new Date(b.bookingTime);
			return t >= d && t < next;
		}).length;
		days.push({ label: d.toLocaleDateString('en-NG', { weekday: 'short' }), count });
	}

	return {
		recentBookings: allBookings,
		totalStudents: allStudents.length,
		activeRiders: allRiders.filter((r) => r.isOnline).length,
		totalRiders: allRiders.length,
		bookingsToday: fullBookings.length,
		revenueToday,
		weekChart: days
	};
};