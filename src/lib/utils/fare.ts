// Fare engine — base fare + per-km rate, matching admin-configurable settings (Chapter 3, 3.3.1-C)
export const BASE_FARE = 200; // ₦
export const RATE_PER_KM = 80; // ₦ per kilometre

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export function estimateFare(distanceKm: number): number {
	const fare = BASE_FARE + distanceKm * RATE_PER_KM;
	// round to nearest 10 naira
	return Math.round(fare / 10) * 10;
}

// Fixed campus reference points (University of Port Harcourt) used for the demo map + fare estimator
export const CAMPUS_LOCATIONS = [
	{ name: 'Abuja Park', lat: 4.9007, lng: 6.9098 },
	{ name: 'Choba Park', lat: 4.8964, lng: 6.9112 },
	{ name: 'Faculty of Science', lat: 4.8985, lng: 6.9145 },
	{ name: 'Faculty of Engineering', lat: 4.9021, lng: 6.9167 },
	{ name: 'Delta Park', lat: 4.8932, lng: 6.9078 },
	{ name: 'Hostel Gate (Choba)', lat: 4.8951, lng: 6.9056 },
	{ name: 'Main Library', lat: 4.8998, lng: 6.9133 },
	{ name: 'Senate Building', lat: 4.9010, lng: 6.9120 },
	{ name: 'UPTH Junction', lat: 4.8889, lng: 6.9201 },
	{ name: 'Aluu Gate', lat: 4.9102, lng: 6.9034 }
] as const;
