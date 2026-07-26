# Changes — Chapter 3 gap-closing pass

This documents every change made to bring the codebase in line with Chapter 3's functional
requirements, following the discrepancy review. Payment gateway integration (Paystack/Flutterwave)
was explicitly out of scope and was **not** added — wallet/transfer are recorded as the passenger's
stated intent only; settlement still happens in person.

## Before you deploy

1. **Run the new migration**: `npm run db:migrate` (or `drizzle-kit migrate`). It's been hand-edited
   to be safe against existing data — see the comments in
   `drizzle/0002_add_matric_photo_audit_complaints_farerates.sql`. If you already have student rows,
   they'll get a placeholder `UNSET-xxxxxxxx` matric number that those students should update.
2. **`scripts/seed-admin.ts` didn't exist** in the zip you sent even though `package.json` referenced
   it (`npm run seed:admin` would have failed outright). It's been rebuilt, and now also seeds the
   `locations` table and the default fare settings row. Run it once after migrating.
3. Existing accounts with non-`@uniport.edu.ng` emails can still **log in** fine — the domain
   restriction only applies to **new passenger registrations**.

## New features

- **Matric number + UNIPORT email verification** — passenger registration now requires a matric
  number and a `@uniport.edu.ng` email.
- **Nearest-driver matching** — riders now report GPS position whenever they're online (not just
  mid-trip). New bookings notify the nearest 1–3 online riders with a priority toast; everyone else
  still sees it in their list as a fallback, sorted by distance, with a "Nearest" badge on top.
- **Rider profile photo** — optional photo URL at registration (no file storage is configured in
  this project, so it's a pasted URL, not an upload), shown to the passenger once matched.
- **Bidirectional ratings** — riders can now rate passengers after a completed trip (the `riderRating`
  column already existed but was never written to).
- **Admin audit log** — every verify/suspend/delete, location edit, fare change, and complaint
  resolution is now recorded. New page: `/admin/audit`.
- **Complaints & disputes** — passengers and riders can report an issue on a completed trip; admins
  review and resolve/dismiss from `/admin/complaints`.
- **Admin Reports** — `/admin/reports`: booking/completion/cancellation counts, revenue, avg fare,
  new signups, with a 7-day/30-day/all-time filter and CSV export.
- **Admin Payments** — `/admin/payments`: read-only ledger + revenue-by-method breakdown. No gateway.
- **Admin Locations** — `/admin/locations`: full CRUD for campus pickup/destination points, which now
  live in the database (`locations` table) instead of being hardcoded — booking forms read from here.
- **Admin Settings** — `/admin/settings`: base fare + per-km rate are now DB-configurable instead of
  hardcoded constants, with a live fare preview.
- **Payment method selection** — passengers pick cash/transfer/wallet when booking; the UI is explicit
  that transfer/wallet are settled in person, since there's no gateway wired up.

## Bug fixes picked up along the way

- Trip completion no longer silently overwrote the passenger's chosen payment method to "cash".
- `scripts/seed-admin.ts` — referenced in `package.json`, missing from the repo entirely.

## Files touched

Schema: `src/lib/server/db/schema.ts`, `drizzle/0002_*.sql` (+ meta snapshots)
New lib: `src/lib/server/audit.ts`, `src/lib/server/settings.ts`
New API: `api/locations`, `api/locations/[id]`, `api/admin/settings`, `api/complaints`, `api/complaints/[id]`
Updated API: `api/bookings`, `api/bookings/[id]`, `api/admin/users`, `api/auth/register/passenger`, `api/auth/register/rider`
New admin pages: `admin/locations`, `admin/settings`, `admin/payments`, `admin/reports`, `admin/complaints`, `admin/audit` (+ sidebar nav)
Updated pages: `passenger/+page.svelte` (+server.ts), `passenger/history`, `rider/+page.svelte` (+server.ts), `register`
`src/lib/utils/fare.ts` — `estimateFare` now accepts admin-configured rates
`scripts/seed-admin.ts` — new (was missing)

## Known trade-offs, stated plainly

- **Rider photo is a pasted URL, not an upload.** No object storage (S3/Cloudinary/etc.) is configured
  in this project. Adding real uploads is a bigger piece of work than this pass covered.
- **"Nearest driver" still broadcasts to everyone as a fallback.** A stricter version that *only*
  notifies nearby riders risks stranding a passenger if no rider is currently within radius or has a
  live GPS fix yet. This trade-off favors reliability over a stricter reading of the spec — worth
  flagging to your supervisor as a documented design decision rather than a gap.
- **Reports export is CSV, not PDF.** Simpler and dependency-free; swap in a PDF library later if you
  want a fancier download.
