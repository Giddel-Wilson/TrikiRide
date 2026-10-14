import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students, riders, admins } from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signSession, SESSION_COOKIE, type Role } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

const schema = z.object({
	identifier: z.string().trim().min(1).max(100).optional(),
	email: z.string().trim().min(1).max(100).optional(),
	password: z.string().min(1),
	role: z.enum(['passenger', 'rider', 'admin'])
}).superRefine((value, ctx) => {
	if (!value.identifier && !value.email) ctx.addIssue({ code: 'custom', path: ['identifier'], message: 'Enter your login.' });
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Enter a valid email and password.' }, { status: 400 });
	}
	const { password, role } = parsed.data;
	const identifier = parsed.data.identifier ?? parsed.data.email!;
	const email = identifier.trim();

	let id: string | undefined;
	let fullname: string | undefined;
	let passwordHash: string | undefined;

	if (role === 'passenger') {
		if (!z.string().email().safeParse(email).success) return json({ error: 'Enter a valid email and password.' }, { status: 400 });
		const u = await db.query.students.findFirst({ where: eq(students.email, email) });
		id = u?.id;
		fullname = u?.fullname;
		passwordHash = u?.passwordHash;
	} else if (role === 'rider') {
		const vehicleIdentifier = identifier.trim().toUpperCase();
		const u = await db.query.riders.findFirst({
			where: or(
				sql`lower(${riders.email}) = ${email.toLowerCase()}`,
				eq(riders.plateNumber, vehicleIdentifier),
				eq(riders.serialNumber, vehicleIdentifier)
			)
		});
		id = u?.id;
		fullname = u?.fullname;
		passwordHash = u?.passwordHash;
	} else {
		if (!z.string().email().safeParse(email).success) return json({ error: 'Enter a valid email and password.' }, { status: 400 });
		const u = await db.query.admins.findFirst({ where: eq(admins.email, email) });
		id = u?.id;
		fullname = u?.fullname;
		passwordHash = u?.passwordHash;
	}

	if (!id || !passwordHash || !(await bcrypt.compare(password, passwordHash))) {
		return json({ error: 'Incorrect email or password.' }, { status: 401 });
	}

	const token = await signSession({ sub: id, role: role as Role, fullname: fullname! });
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	return json({ ok: true, role });
};
