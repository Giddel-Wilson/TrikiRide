# TrikRide — Online Tricycle Ride Booking System

Built for the University of Port Harcourt campus, based on the scope in Chapter 3.
SvelteKit 5 (runes) · TypeScript · Tailwind CSS v4 · Node.js · Neon PostgreSQL (Drizzle ORM) · deployed on Vercel as serverless functions.

## Stack

- **Frontend/Backend**: SvelteKit 5, all API routes are `+server.ts` files that compile to Vercel serverless functions via `@sveltejs/adapter-vercel`.
- **Database**: Neon Postgres, accessed over HTTP via `@neondatabase/serverless` + Drizzle ORM (no persistent connections — works on serverless).
- **Auth**: Custom email/password auth, bcrypt-hashed passwords, JWT session in an httpOnly cookie (via `jose`).
- **Styling**: Tailwind v4 with a custom Ride-Hailing theme (dark map palette + route blue), Space Grotesk/DM Sans type pairing, EK-design motion (160-360ms eased transitions, staggered list entrances, `prefers-reduced-motion` respected).
- **Fare engine**: 200 naira base + 80 naira/km, haversine distance between fixed campus locations (swap in Google Maps/Places later for live geocoding).

## Roles

| Role | Routes | Capabilities |
|---|---|---|
| Passenger | `/passenger/*` | Book a ride, view live status, see matched rider, cancel, rate completed trips |
| Rider | `/rider/*` | Go online/offline, see incoming requests, accept/start/complete trips, view earnings |
| Admin | `/admin/*` | KPI dashboard, all bookings, verify/suspend/remove riders, view passengers |

## Local setup

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL (Neon) and JWT_SECRET
npm run db:generate        # already generated once in drizzle/, re-run after schema changes
npm run db:migrate         # applies migrations to your Neon database
npm run seed:admin         # creates the first admin login (admin@trikride.app / ChangeMe123!)
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel - it auto-detects SvelteKit.
3. Add environment variables in the Vercel dashboard: `DATABASE_URL`, `JWT_SECRET`.
4. Deploy. API routes under `/api/*` and all page server loads run as serverless functions automatically.

## Database schema

See `src/lib/server/db/schema.ts` - `students`, `riders`, `bookings`, `payments`, `admins`, `locations`, matching the entities described in Chapter 3 (3.3.1 system design).

## Next steps / where to extend

- Swap the static `CAMPUS_LOCATIONS` list in `src/lib/utils/fare.ts` for live Google Places Autocomplete.
- Add Server-Sent Events or polling on `/passenger` and `/rider` for real-time status updates instead of `invalidateAll()`.
- Add an admin-configurable fare settings table instead of the constants in `fare.ts`.
- Wire `payments.method = 'transfer'` to Paystack/Flutterwave.
