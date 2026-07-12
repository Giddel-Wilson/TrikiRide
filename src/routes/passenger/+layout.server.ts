import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'passenger') {
		throw redirect(302, '/login?as=passenger');
	}
	return { user: locals.user };
};
