import { db } from '$lib/server/db';
import { fareSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { BASE_FARE, RATE_PER_KM } from '$lib/utils/fare';

/**
 * Returns the current admin-configured fare settings as numbers, creating the
 * singleton row (with the code-level defaults) the first time it's read.
 */
export async function getFareSettings(): Promise<{ baseFare: number; ratePerKm: number }> {
	const row = await db.query.fareSettings.findFirst({ where: eq(fareSettings.id, 'default') });
	if (row) return { baseFare: Number(row.baseFare), ratePerKm: Number(row.ratePerKm) };

	const [created] = await db
		.insert(fareSettings)
		.values({ id: 'default', baseFare: String(BASE_FARE), ratePerKm: String(RATE_PER_KM) })
		.onConflictDoNothing()
		.returning();

	if (created) return { baseFare: Number(created.baseFare), ratePerKm: Number(created.ratePerKm) };
	// Lost a race with another request creating the row — just read it back.
	const retry = await db.query.fareSettings.findFirst({ where: eq(fareSettings.id, 'default') });
	return retry
		? { baseFare: Number(retry.baseFare), ratePerKm: Number(retry.ratePerKm) }
		: { baseFare: BASE_FARE, ratePerKm: RATE_PER_KM };
}
