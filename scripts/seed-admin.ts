// Run with: npx tsx scripts/seed-admin.ts
// Creates the first administrator account.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from '../src/lib/server/db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
	const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@trikride.app';
	const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
	const passwordHash = await bcrypt.hash(password, 10);

	await db.insert(schema.admins).values({
	fullname: 'TrikRide Admin',
	email,
	passwordHash
}).onConflictDoNothing();

	console.log(`Admin created: ${email} / ${password}`);
	console.log('Change this password after first login.');
}

main().then(() => process.exit(0)).catch((e) => {
	console.error(e);
	process.exit(1);
});
