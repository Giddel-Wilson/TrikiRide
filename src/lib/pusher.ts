import { browser } from '$app/environment';
import { PUBLIC_PUSHER_KEY, PUBLIC_PUSHER_CLUSTER } from '$env/static/public';

export function getPusher() {
	if (!browser) return null;
	// dynamic import to ensure it only runs in the browser
	return import('pusher-js').then(({ default: PusherJS }) => {
		return new PusherJS(PUBLIC_PUSHER_KEY, {
			cluster: PUBLIC_PUSHER_CLUSTER
		});
	});
}