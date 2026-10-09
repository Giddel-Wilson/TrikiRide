import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students, riders, admins } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signSession, SESSION_COOKIE, type Role } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	role: z.enum(['passenger', 'rider', 'admin'])
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Enter a valid email and password.' }, { status: 400 });
	}
	const { email, password, role } = parsed.data;

	let id: string | undefined;
	let fullname: string | undefined;
	let passwordHash: string | undefined;

	if (role === 'passenger') {
		const u = await db.query.students.findFirst({ where: eq(students.email, email) });
		id = u?.id;
		fullname = u?.fullname;
		passwordHash = u?.passwordHash;
	} else if (role === 'rider') {
		const u = await db.query.riders.findFirst({ where: eq(riders.email, email) });
		id = u?.id;
		fullname = u?.fullname;
		passwordHash = u?.passwordHash;
	} else {
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
