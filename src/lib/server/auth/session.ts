import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '$env/static/private';

const secret = new TextEncoder().encode(JWT_SECRET);

export type Role = 'passenger' | 'rider' | 'admin';

export interface SessionPayload {
	sub: string; // user id
	role: Role;
	fullname: string;
	[key: string]: unknown;
}

export async function signSession(payload: SessionPayload): Promise<string> {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify(token, secret);
		return payload as unknown as SessionPayload;
	} catch {
		return null;
	}
}

export const SESSION_COOKIE = 'trikride_session';
