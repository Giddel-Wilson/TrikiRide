<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TrikMap from '$lib/components/TrikMap.svelte';
	import type { MapMarker } from '$lib/components/TrikMap.svelte';
	import { CAMPUS_LOCATIONS } from '$lib/utils/fare';
	import { pushToast } from '$lib/components/toast.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getPusher } from '$lib/pusher';

	let { data } = $props();

	let online         = $state(data.rider?.isOnline ?? false);
	let togglingOnline = $state(false);
	let acting         = $state(false);
	let myLat          = $state<number | null>(null);
	let myLng          = $state<number | null>(null);

	let watchId:   number | null = null;
	let sendTimer: ReturnType<typeof setInterval> | null = null;

	// --- Geolocation tracking ---
	function startTracking() {
		if (!('geolocation' in navigator)) { pushToast('Geolocation not available on this device.', 'error'); return; }
		watchId = navigator.geolocation.watchPosition(
			(pos) => { myLat = pos.coords.latitude; myLng = pos.coords.longitude; },
			(err) => console.warn('GPS error:', err),
			{ enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
		);
		sendTimer = setInterval(async () => {
			if (myLat === null || myLng === null) return;
			await fetch('/api/rider/location', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ lat: myLat, lng: myLng })
			});
		}, 5000);
	}

	function stopTracking() {
		if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
		if (sendTimer)        { clearInterval(sendTimer); sendTimer = null; }
	}

	$effect(() => {
		if (online && activeRide) { startTracking(); }
		else                      { stopTracking();  }
		return () => stopTracking();
	});

	onDestroy(stopTracking);

	// --- Pusher real-time ---
	onMount(async () => {
		const pusherClient = await getPusher();
		if (!pusherClient) return;

		const channel = pusherClient.subscribe(`rider-${data.user.id}`);
		channel.bind('booking-updated', () => invalidateAll());

		const availableChannel = pusherClient.subscribe('available-bookings');
		availableChannel.bind('new-booking', () => invalidateAll());
		availableChannel.bind('booking-taken', () => invalidateAll());

		return () => {
			pusherClient.unsubscribe(`rider-${data.user.id}`);
			pusherClient.unsubscribe('available-bookings');
		};
	});

	// --- Online toggle ---
	async function toggleOnline() {
		togglingOnline = true;
		const next = !online;
		try {
			const res = await fetch('/api/rider/status', {
				method: 'PATCH', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ isOnline: next })
			});
			if (res.ok) {
				online = next;
				pushToast(next ? "You're online — incoming requests will appear here." : 'You are now offline.', 'info');
			}
		} finally { togglingOnline = false; }
	}

	// --- Booking actions ---
	async function act(id: string, action: 'accept' | 'decline' | 'arrive' | 'start' | 'complete') {
		if (acting) return;
		acting = true;
		try {
			const res = await fetch(`/api/bookings/${id}`, {
				method: 'PATCH', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action })
			});
			const result = await res.json();
			if (!res.ok) { pushToast(result.message ?? 'Action failed.', 'error'); return; }
			const msgs: Record<string, string> = {
    accept:   'Ride accepted — head to the pickup point.',
    decline:  'Booking removed from your list.',
    arrive:   "You've arrived! Waiting for passenger.",
    start:    'Trip started — safe ride!',
    complete: 'Trip completed. Earnings updated.'
};
			pushToast(msgs[action], 'success');
			await invalidateAll();
		} finally {
			acting = false;
		}
	}

	const activeRide      = $derived(data.mine.find((b: any) => ['accepted', 'arrived_pickup', 'ongoing'].includes(b.bookingStatus)));
	const recentCompleted = $derived(data.mine.filter((b: any) => b.bookingStatus === 'completed').slice(0, 5));

	// --- Map markers ---
	const mapMarkers = $derived<MapMarker[]>((() => {
		const m: MapMarker[] = [];

		if (myLat !== null && myLng !== null)
			m.push({ id: 'self', lat: myLat, lng: myLng, type: 'self', label: 'You', pulse: true });

		if (activeRide) {
			const pickupLat = Number(activeRide.pickupLat);
			const pickupLng = Number(activeRide.pickupLng);
			const destLat   = Number(activeRide.destinationLat);
			const destLng   = Number(activeRide.destinationLng);

			if (['accepted', 'arrived_pickup'].includes(activeRide.bookingStatus) && pickupLat && pickupLng)
				m.push({ id: 'pickup', lat: pickupLat, lng: pickupLng, type: 'pickup', label: `Pickup: ${activeRide.pickupLocation}` });

			if (activeRide.bookingStatus === 'ongoing' && destLat && destLng)
				m.push({ id: 'destination', lat: destLat, lng: destLng, type: 'destination', label: `Drop-off: ${activeRide.destination}` });
		} else if (data.available.length > 0) {
			const nearest = data.available[0];
			const lat = Number(nearest.pickupLat);
			const lng = Number(nearest.pickupLng);
			if (lat && lng)
				m.push({ id: 'pickup', lat, lng, type: 'pickup', label: `Request: ${nearest.pickupLocation}` });
		}

		return m;
	})());

	const mapCenter = $derived<[number, number]>(
		myLat && myLng ? [myLat, myLng] : [4.9005, 6.9145]
	);

	const ridePhase: Record<string, { banner: string; bannerColor: string; btnLabel: string; action: 'accept'|'arrive'|'start'|'complete' }> = {
		accepted:       { banner: 'Head to the pickup point',        bannerColor: 'bg-blue-50 text-blue-700',     btnLabel: "I've Arrived at Pickup",    action: 'arrive'   },
		arrived_pickup: { banner: 'Waiting for passenger to board',  bannerColor: 'bg-violet-50 text-violet-700', btnLabel: 'Start Trip',                action: 'start'    },
		ongoing:        { banner: 'Trip in progress — ride safely',  bannerColor: 'bg-green-50 text-green-700',   btnLabel: 'Complete Trip / Delivered', action: 'complete' }
	};
</script>

<svelte:head><title>Rider dashboard — TrikRide</title></svelte:head>

<!-- Header row -->
<div class="flex flex-wrap items-center justify-between gap-4">
	<div>
		<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Welcome, {data.user.fullname.split(' ')[0]}</h1>
		<p class="mt-0.5 text-sm text-[var(--color-fg-muted)]">{data.rider?.plateNumber}</p>
	</div>
	<button onclick={toggleOnline} disabled={togglingOnline}
		class="btn-press tap-target flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 {online
			? 'border-green-300 bg-green-50 text-green-700'
			: 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]'}">
		<span class="h-2 w-2 rounded-full {online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}"></span>
		{online ? 'Online' : 'Go Online'}
	</button>
</div>

<!-- KPI strip -->
<div class="mt-5 grid grid-cols-3 gap-3">
	<div class="card-tinted rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Today's trips</p>
		<p class="font-heading mt-1 text-xl font-semibold text-[var(--color-fg)]">{data.todaysTrips}</p>
	</div>
	<div class="card-tinted rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Today's earnings</p>
		<p class="font-heading mt-1 text-xl font-semibold text-[var(--color-accent)]">₦{data.todaysEarnings}</p>
	</div>
	<div class="card-tinted rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Rating</p>
		<p class="font-heading mt-1 text-xl font-semibold text-[var(--color-fg)]">★ {data.rider?.avgRating}</p>
	</div>
</div>

<!-- Main grid: map left, actions right -->
<div class="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
	<!-- Live map -->
	<div class="relative h-72 overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-sm lg:h-auto lg:min-h-[420px]">
		<TrikMap
			height="100%"
			center={mapCenter}
			zoom={15}
			markers={mapMarkers}
			autoFit={mapMarkers.length > 1}
		/>
		{#if myLat && myLng}
			<div class="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-fg)] shadow-md">
				<span class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
				GPS active
			</div>
		{:else if online}
			<div class="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
				Acquiring GPS…
			</div>
		{/if}
	</div>

	<!-- Right panel -->
	<div class="space-y-4">
		{#if activeRide}
			{@const phase = ridePhase[activeRide.bookingStatus]}
			<div class="enter-fade card-surface rounded-2xl p-5 shadow-sm">
				<div class="flex items-center justify-between">
					<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Active trip</h2>
					<StatusBadge status={activeRide.bookingStatus} />
				</div>

				{#if phase}
					<div class="mt-3 rounded-xl px-4 py-3 text-sm font-medium {phase.bannerColor}">
						{phase.banner}
					</div>
				{/if}

				<div class="mt-3 space-y-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
						<p class="text-[var(--color-fg-muted)]">{activeRide.pickupLocation}</p>
					</div>
					<div class="ml-[3px] h-4 w-px bg-[var(--color-border)]"></div>
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 shrink-0 rounded-full bg-blue-500"></span>
						<p class="text-[var(--color-fg-muted)]">{activeRide.destination}</p>
					</div>
				</div>

				<div class="mt-3 flex items-center justify-between">
					<p class="font-heading text-xl font-semibold text-[var(--color-accent)]">₦{activeRide.fare}</p>
					<p class="text-sm text-[var(--color-fg-muted)]">{activeRide.distanceKm} km</p>
				</div>

				<!-- Passenger info -->
				<div class="mt-4 flex items-center gap-3 rounded-xl bg-[var(--color-surface)] p-3">
					<div class="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-[var(--color-accent)]">
						{activeRide.student.fullname.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-[var(--color-fg)] truncate">{activeRide.student.fullname}</p>
						<p class="text-xs text-[var(--color-fg-muted)]">{activeRide.student.phone}</p>
					</div>
					<a href="tel:{activeRide.student.phone}" aria-label="Call passenger"
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-[var(--color-accent)] hover:bg-green-200">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 3.18 2 2 0 012.45 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.4a16 16 0 006.29 6.29l.79-.79a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
					</a>
				</div>

				{#if phase}
					<button onclick={() => act(activeRide.id, phase.action)} disabled={acting}
						class="btn-press tap-target mt-4 w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)] active:scale-[0.98] disabled:opacity-60">
						{acting ? 'Updating…' : phase.btnLabel}
					</button>
				{/if}
			</div>

		{:else if !online}
			<div class="card-tinted rounded-2xl p-8 text-center">
				<p class="text-2xl">🛺</p>
				<p class="mt-3 font-heading text-sm font-semibold text-[var(--color-fg)]">You're offline</p>
				<p class="mt-1 text-xs text-[var(--color-fg-muted)]">Go online to start receiving ride requests from passengers.</p>
				<button onclick={toggleOnline} class="btn-press tap-target mt-4 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">Go Online</button>
			</div>

		{:else if data.available.length === 0}
			<div class="card-tinted rounded-2xl p-8 text-center">
				<p class="text-2xl">🕐</p>
				<p class="mt-3 font-heading text-sm font-semibold text-[var(--color-fg)]">No requests yet</p>
				<p class="mt-1 text-xs text-[var(--color-fg-muted)]">Stay online — incoming requests will appear here instantly.</p>
			</div>

		{:else}
			<div class="space-y-3">
				<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Incoming requests</h2>
				{#each data.available as b, i (b.id)}
					<div class="stagger-item card-surface rounded-xl p-4 shadow-sm" style="animation-delay: {i * 60}ms">
						<div class="flex items-start justify-between">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-[var(--color-fg)]">{b.pickupLocation} → {b.destination}</p>
								<p class="mt-1 text-xs text-[var(--color-fg-muted)]">{b.student.fullname} · {b.distanceKm} km</p>
							</div>
							<p class="ml-4 shrink-0 font-heading text-base font-semibold text-[var(--color-accent)]">₦{b.fare}</p>
						</div>
						<div class="mt-3 flex gap-2">
							<button onclick={() => act(b.id, 'accept')} disabled={!data.rider?.isVerified || acting}
								class="btn-press tap-target flex-1 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-50">
								Accept
							</button>
							<button onclick={() => act(b.id, 'decline')} disabled={acting}
    class="btn-press tap-target flex-1 rounded-lg border border-[var(--color-border)] py-2 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:opacity-50">
    Decline
</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if recentCompleted.length > 0}
			<div>
				<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Recent trips</h2>
				<div class="mt-3 space-y-2">
					{#each recentCompleted as b (b.id)}
						<div class="card-surface flex items-center justify-between rounded-xl p-3.5 shadow-sm">
							<p class="text-sm text-[var(--color-fg-muted)] truncate">{b.pickupLocation} → {b.destination}</p>
							<p class="ml-4 shrink-0 text-sm font-medium text-[var(--color-accent)]">₦{b.fare}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>