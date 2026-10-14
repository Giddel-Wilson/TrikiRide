import { createUploadthing, type FileRouter } from 'uploadthing/server';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth/session';

const f = createUploadthing();

async function riderFromRequest(req: Request) {
	const cookie = req.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
	if (!cookie) throw new Error('Sign in as a rider to upload KYC files.');
	const token = decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
	const session = await verifySession(token);
	if (session?.role !== 'rider') throw new Error('Only riders can upload KYC files.');
	return { riderId: session.sub };
}

export const ourFileRouter = {
	kycDocument: f({ image: { maxFileSize: '8MB', maxFileCount: 1 }, pdf: { maxFileSize: '8MB', maxFileCount: 1 } })
		.middleware(async ({ req }) => riderFromRequest(req))
		.onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
	kycFaceScan: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
		.middleware(async ({ req }) => riderFromRequest(req))
		.onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
	// Registration happens before a rider session exists, so profile photos use a public image-only route.
	riderProfilePhoto: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
		.onUploadComplete(async ({ file }) => ({ url: file.ufsUrl }))
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
