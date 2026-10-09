import { pusher } from '$lib/server/pusher';

/** Realtime delivery is best-effort; it must not turn a completed database action into a 500. */
export async function triggerPusher(channel: string, event: string, data: Record<string, unknown>): Promise<void> {
	try {
		await pusher.trigger(channel, event, data);
	} catch (cause) {
		console.error('[pusher] Event delivery failed', {
			channel,
			event,
			message: cause instanceof Error ? cause.message : String(cause)
		});
	}
}
