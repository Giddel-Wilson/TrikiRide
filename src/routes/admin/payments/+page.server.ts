import { db } from '$lib/server/db';
import { payments } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db.query.payments.findMany({
		limit: 200,
		with: {
			booking: {
				columns: { pickupLocation: true, destination: true, bookingTime: true },
				with: {
					student: { columns: { fullname: true } },
					rider: { columns: { fullname: true } }
				}
			}
		}
	});
	rows.sort((a, b) => {
		const at = a.booking?.bookingTime ? new Date(a.booking.bookingTime).getTime() : 0;
		const bt = b.booking?.bookingTime ? new Date(b.booking.bookingTime).getTime() : 0;
		return bt - at;
	});

	const totalRevenue = rows.filter((p) => p.status === 'successful').reduce((s, p) => s + Number(p.amount), 0);
	const byMethod = { cash: 0, wallet: 0, transfer: 0 } as Record<string, number>;
	for (const p of rows) if (p.status === 'successful') byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);

	return { payments: rows, totalRevenue, byMethod };
};
