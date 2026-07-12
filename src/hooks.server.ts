import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const payload = await verifySession(token);
		if (payload) {
			event.locals.user = {
				id: payload.sub,
				role: payload.role,
				fullname: payload.fullname
			};
		}
	}

	// Route guards
	const path = event.url.pathname;
	const user = event.locals.user;

	if (path.startsWith('/passenger') && user?.role !== 'passenger') {
		return new Response(null, { status: 302, headers: { location: '/login?as=passenger' } });
	}
	if (path.startsWith('/rider') && user?.role !== 'rider') {
		return new Response(null, { status: 302, headers: { location: '/login?as=rider' } });
	}
	if (path.startsWith('/admin') && user?.role !== 'admin') {
		return new Response(null, { status: 302, headers: { location: '/login?as=admin' } });
	}

	return resolve(event);
};
