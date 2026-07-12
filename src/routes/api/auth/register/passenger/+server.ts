import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signSession, SESSION_COOKIE } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

const schema = z.object({
	fullname: z.string().min(2).max(100),
	email: z.string().email(),
	phone: z.string().min(7).max(15),
	password: z.string().min(6)
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
const field = issue?.path[0] ? `${issue.path[0]}: ` : '';
return json({ error: `${field}${issue?.message ?? 'Invalid input'}` }, { status: 400 });
	}
	const { fullname, email, phone, password } = parsed.data;

	const existing = await db.query.students.findFirst({ where: eq(students.email, email) });
	if (existing) {
		return json({ error: 'An account with this email already exists.' }, { status: 409 });
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const [student] = await db
		.insert(students)
		.values({ fullname, email, phone, passwordHash })
		.returning();

	const token = await signSession({ sub: student.id, role: 'passenger', fullname: student.fullname });
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

	return json({ ok: true, role: 'passenger' });
};
