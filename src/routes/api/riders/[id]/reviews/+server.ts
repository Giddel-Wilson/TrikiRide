import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bookings } from '$lib/server/db/schema';
import { and, eq, isNotNull, desc, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const LIMIT = 3;

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'Sign in to continue.');

	const page   = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const offset = (page - 1) * LIMIT;

	const [{ total }] = await db
		.select({ total: count() })
		.from(bookings)
		.where(and(eq(bookings.riderId, params.id), isNotNull(bookings.passengerRating)));

	const reviews = await db.query.bookings.findMany({
		where:   and(eq(bookings.riderId, params.id), isNotNull(bookings.passengerRating)),
		orderBy: desc(bookings.completedAt),
		limit:   LIMIT,
		offset,
		columns: { id: true, passengerRating: true, passengerComment: true, completedAt: true },
		with:    { student: { columns: { fullname: true } } }
	});

	return json({ reviews, total, page, totalPages: Math.ceil(Number(total) / LIMIT) });
};