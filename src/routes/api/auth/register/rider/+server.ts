import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { riders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signSession, SESSION_COOKIE } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

const schema = z.object({
	fullname: z.string().min(2).max(100),
	email: z.string().email(),
	phone: z.string().min(7).max(15),
	licenceNumber: z.string().min(2).max(50),
	plateNumber: z.string().min(2).max(20),
	tricycleModel: z.string().max(100).optional(),
	tricycleColour: z.string().max(50).optional(),
	password: z.string().min(6)
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
	}
	const { password, ...rest } = parsed.data;

	const existingEmail = await db.query.riders.findFirst({ where: eq(riders.email, rest.email) });
	if (existingEmail) {
		return json({ error: 'An account with this email already exists.' }, { status: 409 });
	}
	const existingPlate = await db.query.riders.findFirst({
		where: eq(riders.plateNumber, rest.plateNumber)
	});
	if (existingPlate) {
		return json({ error: 'This plate number is already registered.' }, { status: 409 });
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const [rider] = await db
		.insert(riders)
		.values({ ...rest, passwordHash })
		.returning();

	const token = await signSession({ sub: rider.id, role: 'rider', fullname: rider.fullname });
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

	return json({ ok: true, role: 'rider' });
};
