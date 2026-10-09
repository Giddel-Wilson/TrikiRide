// Bootstraps a fresh database: first admin login, campus locations, and default fare settings.
// Run with: npm run seed:admin
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import { CAMPUS_LOCATIONS, BASE_FARE, RATE_PER_KM } from '../src/lib/utils/fare';

const ADMIN_EMAIL = 'admin@trikride.app';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function main() {
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL is not set — copy .env.example to .env and fill it in first.');
		process.exit(1);
	}

	const sql = neon(process.env.DATABASE_URL);
	const db = drizzle(sql, { schema });

	// 1. First admin login
	const existingAdmin = await db.query.admins.findFirst({ where: eq(schema.admins.email, ADMIN_EMAIL) });
	if (existingAdmin) {
		console.log(`Admin already exists (${ADMIN_EMAIL}) — skipping.`);
	} else {
		const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
		await db.insert(schema.admins).values({ fullname: 'TrikRide Admin', email: ADMIN_EMAIL, passwordHash });
		console.log(`Created admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
	}

	// 2. Campus locations (used for pickup/destination pickers and the Admin > Locations page)
	const existingLocations = await db.query.locations.findMany();
	if (existingLocations.length > 0) {
		console.log(`${existingLocations.length} location(s) already seeded — skipping.`);
	} else {
		await db.insert(schema.locations).values(
			CAMPUS_LOCATIONS.map((l) => ({ name: l.name, lat: String(l.lat), lng: String(l.lng) }))
		);
		console.log(`Seeded ${CAMPUS_LOCATIONS.length} campus locations.`);
	}

	// 3. Default fare settings row (base fare + rate per km), editable later from Admin > Settings
	const existingFareSettings = await db.query.fareSettings.findFirst({
		where: eq(schema.fareSettings.id, 'default')
	});
	if (existingFareSettings) {
		console.log('Fare settings already seeded — skipping.');
	} else {
		await db
			.insert(schema.fareSettings)
			.values({ id: 'default', baseFare: String(BASE_FARE), ratePerKm: String(RATE_PER_KM) });
		console.log(`Seeded fare settings: ₦${BASE_FARE} base + ₦${RATE_PER_KM}/km.`);
	}

	console.log('Done.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
