<script lang="ts">
	import { CAMPUS_LOCATIONS, estimateFare, haversineKm } from '$lib/utils/fare';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TrikMap from '$lib/components/TrikMap.svelte';
	import type { MapMarker } from '$lib/components/TrikMap.svelte';
	import { pushToast } from '$lib/components/toast.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getPusher } from '$lib/pusher';

	let { data } = $props();

	let pickup      = $state<string>(CAMPUS_LOCATIONS[0].name);
	let destination = $state<string>(CAMPUS_LOCATIONS[2].name);
	let booking     = $state(false);

	// Live rider tracking state
	let riderLat    = $state<number | null>(null);
	let riderLng    = $state<number | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	// Reviews state
	let showReviews      = $state(false);
	let riderReviews     = $state<any[]>([]);
	let reviewPage       = $state(1);
	let reviewTotalPages = $state(1);

	const pickupLoc    = $derived(CAMPUS_LOCATIONS.find(l => l.name === pickup)!);
	const destLoc      = $derived(CAMPUS_LOCATIONS.find(l => l.name === destination)!);
	const distanceKm   = $derived(pickupLoc && destLoc ? haversineKm(pickupLoc.lat, pickupLoc.lng, destLoc.lat, destLoc.lng) : 0);
	const fare         = $derived(estimateFare(distanceKm));
	const sameLocation = $derived(pickup === destination);

	const activeBooking = $derived(
		data.bookings.find((b: any) => !['completed', 'cancelled'].includes(b.bookingStatus))
	);
	const unratedCompleted = $derived(
		data.bookings.find((b: any) => b.bookingStatus === 'completed' && b.passengerRating == null)
	);

	const activePickupLoc = $derived(
		activeBooking
			? { lat: Number(activeBooking.pickupLat),      lng: Number(activeBooking.pickupLng) }
			: pickupLoc
	);
	const activeDestLoc = $derived(
		activeBooking
			? { lat: Number(activeBooking.destinationLat), lng: Number(activeBooking.destinationLng) }
			: destLoc
	);

	const mapMarkers = $derived<MapMarker[]>([
		activePickupLoc
			? { id: 'pickup', lat: activePickupLoc.lat, lng: activePickupLoc.lng, type: 'pickup',
			    label: activeBooking?.pickupLocation ?? pickup }
			: null,
		activeDestLoc
			? { id: 'destination', lat: activeDestLoc.lat, lng: activeDestLoc.lng, type: 'destination',
			    label: activeBooking?.destination ?? destination }
			: null,
		(riderLat !== null && riderLng !== null)
			? { id: 'rider', lat: riderLat, lng: riderLng, type: 'rider',
			    label: activeBooking?.rider?.fullname ?? 'Your rider', pulse: true }
			: null
	].filter(Boolean) as MapMarker[]);

	const mapCenter = $derived<[number, number]>(
		riderLat && riderLng
			? [riderLat, riderLng]
			: activePickupLoc
				? [activePickupLoc.lat, activePickupLoc.lng]
				: [4.9005, 6.9145]
	);

	const statusMessage: Record<string, { title: string; sub: string }> = {
		pending:        { title: 'Looking for a nearby rider…', sub: 'Hold on while we find the closest available rider.' },
		accepted:       { title: 'Your rider is on the way!', sub: 'They are heading to your pickup point right now.' },
		arrived_pickup: { title: 'Your rider has arrived!', sub: 'Head to the pickup point — your rider is waiting.' },
		ongoing:        { title: 'You\'re on your way!', sub: `Heading to your destination.` },
		completed:      { title: 'Trip complete!', sub: 'You have arrived safely. Please rate your rider.' }
	};

	function startPolling(bookingId: string) {
		stopPolling();
		pollTimer = setInterval(async () => {
			const res = await fetch(`/api/bookings/${bookingId}/track`);
			if (!res.ok) return;
			const d = await res.json();
			if (d.riderLat !== null) riderLat = Number(d.riderLat);
			if (d.riderLng !== null) riderLng = Number(d.riderLng);
			if (d.bookingStatus === 'completed' || d.bookingStatus === 'cancelled') {
				stopPolling();
				await invalidateAll();
			}
		}, 5000);
	}

	function stopPolling() {
		if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
	}

	$effect(() => {
		if (activeBooking?.riderId) {
			startPolling(activeBooking.id);
		} else {
			stopPolling();
			riderLat = null;
			riderLng = null;
		}
		return () => stopPolling();
	});

	onDestroy(stopPolling);

	// Pusher real-time
	onMount(async () => {
		const pusherClient = await getPusher();
		if (!pusherClient) return;

		const channel = pusherClient.subscribe(`passenger-${data.user.id}`);
		channel.bind('booking-updated', () => invalidateAll());

		return () => pusherClient.unsubscribe(`passenger-${data.user.id}`);
	});

	// Reviews
	async function loadReviews(riderId: string, page = 1) {
		const res = await fetch(`/api/riders/${riderId}/reviews?page=${page}`);
		if (res.ok) {
			const d          = await res.json();
			riderReviews     = d.reviews;
			reviewPage       = d.page;
			reviewTotalPages = d.totalPages;
		}
		showReviews = true;
	}

	async function confirmBooking() {
		if (sameLocation) return;
		booking = true;
		try {
			const res = await fetch('/api/bookings', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					pickupLocation: pickupLoc.name, pickupLat: pickupLoc.lat, pickupLng: pickupLoc.lng,
					destination:    destLoc.name,   destinationLat: destLoc.lat, destinationLng: destLoc.lng
				})
			});
			const result = await res.json();
			if (!res.ok) { pushToast(result.error ?? 'Could not create booking.', 'error'); return; }
			pushToast('Ride requested — searching for a nearby rider…', 'success');
			await invalidateAll();
		} finally { booking = false; }
	}

	async function cancelBooking(id: string) {
		const res = await fetch(`/api/bookings/${id}`, {
			method: 'PATCH', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'cancel' })
		});
		if (res.ok) { pushToast('Booking cancelled.', 'info'); await invalidateAll(); }
	}

	let ratingValue = $state(5);
	let comment     = $state('');
	async function submitRating(id: string) {
		const res = await fetch(`/api/bookings/${id}`, {
			method: 'PATCH', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'rate', rating: ratingValue, comment })
		});
		if (res.ok) { pushToast('Thanks for rating your trip!', 'success'); comment = ''; await invalidateAll(); }
	}
</script>

<svelte:head><title>Book a ride — TrikRide</title></svelte:head>

<div class="grid gap-6 lg:grid-cols-[1fr_380px]">
	<!-- Live map -->
	<div class="enter-fade relative h-80 overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-sm lg:h-full lg:min-h-[500px]">
		<TrikMap
			height="100%"
			center={mapCenter}
			zoom={15}
			markers={mapMarkers}
			autoFit={mapMarkers.length > 1}
		/>
		{#if activeBooking?.riderId && riderLat}
			<div class="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-fg)] shadow-md">
				<span class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
				Rider location live
			</div>
		{/if}
	</div>

	<!-- Right panel -->
	<div class="space-y-4">
		{#if activeBooking}
			<div class="enter-fade card-surface rounded-2xl p-5 shadow-sm">
				<div class="flex items-center justify-between">
					<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Active ride</h2>
					<StatusBadge status={activeBooking.bookingStatus} />
				</div>

				{#if statusMessage[activeBooking.bookingStatus]}
					<div class="mt-3 rounded-xl bg-[var(--color-surface)] px-4 py-3">
						<p class="text-sm font-medium text-[var(--color-fg)]">{statusMessage[activeBooking.bookingStatus].title}</p>
						<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">{statusMessage[activeBooking.bookingStatus].sub}</p>
					</div>
				{/if}

				<div class="mt-3 space-y-1 text-sm">
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
						<p class="text-[var(--color-fg-muted)]">{activeBooking.pickupLocation}</p>
					</div>
					<div class="ml-[3px] h-4 w-px bg-[var(--color-border)]"></div>
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 shrink-0 rounded-full bg-blue-500"></span>
						<p class="text-[var(--color-fg-muted)]">{activeBooking.destination}</p>
					</div>
				</div>

				<p class="mt-3 font-heading text-xl font-semibold text-[var(--color-accent)]">₦{activeBooking.fare}</p>

				{#if activeBooking.rider}
					<div class="mt-4 flex items-center gap-3 rounded-xl bg-[var(--color-surface)] p-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-heading text-sm font-semibold text-[var(--color-accent)]">
							{activeBooking.rider.fullname.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-semibold text-[var(--color-fg)] truncate">{activeBooking.rider.fullname}</p>
							<p class="text-xs text-[var(--color-fg-muted)]">{activeBooking.rider.plateNumber} · ★ {activeBooking.rider.avgRating}</p>
						</div>
						<a href="tel:{activeBooking.rider.phone}" aria-label="Call rider" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-[var(--color-accent)] hover:bg-green-200">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 3.18 2 2 0 012.45 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.4a16 16 0 006.29 6.29l.79-.79a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
						</a>
					</div>

					<!-- Reviews toggle -->
					<button onclick={() => showReviews ? (showReviews = false) : loadReviews(activeBooking.rider.id)}
						class="mt-3 w-full text-center text-xs font-medium text-[var(--color-accent)] hover:underline">
						{showReviews ? 'Hide reviews' : `See reviews for ${activeBooking.rider.fullname.split(' ')[0]}`}
					</button>

					{#if showReviews}
						<div class="mt-2 space-y-2">
							{#if riderReviews.length === 0}
								<p class="text-center text-xs text-[var(--color-fg-muted)]">No reviews yet.</p>
							{:else}
								{#each riderReviews as review (review.id)}
									<div class="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2">
										<div class="flex items-center justify-between">
											<p class="text-xs font-medium text-[var(--color-fg)]">{review.student.fullname}</p>
											<p class="text-xs text-amber-500">{'★'.repeat(review.passengerRating)}{'☆'.repeat(5 - review.passengerRating)}</p>
										</div>
										{#if review.passengerComment}
											<p class="mt-1 text-xs text-[var(--color-fg-muted)]">{review.passengerComment}</p>
										{/if}
									</div>
								{/each}
								{#if reviewTotalPages > 1}
									<div class="flex items-center justify-between pt-1">
										<button
											disabled={reviewPage <= 1}
											onclick={() => loadReviews(activeBooking.rider.id, reviewPage - 1)}
											class="text-xs font-medium text-[var(--color-accent)] disabled:opacity-40 hover:underline">
											← Prev
										</button>
										<p class="text-xs text-[var(--color-fg-muted)]">Page {reviewPage} of {reviewTotalPages}</p>
										<button
											disabled={reviewPage >= reviewTotalPages}
											onclick={() => loadReviews(activeBooking.rider.id, reviewPage + 1)}
											class="text-xs font-medium text-[var(--color-accent)] disabled:opacity-40 hover:underline">
											Next →
										</button>
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				{:else}
					<div class="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						Matching you with the nearest available rider…
					</div>
				{/if}

				{#if ['pending', 'accepted', 'arrived_pickup'].includes(activeBooking.bookingStatus)}
					<button onclick={() => cancelBooking(activeBooking.id)}
						class="btn-press tap-target mt-4 w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
						Cancel booking
					</button>
				{/if}
			</div>

		{:else if unratedCompleted}
			<div class="enter-fade card-surface rounded-2xl p-5 shadow-sm">
				<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Rate your last trip</h2>
				<p class="mt-1 text-xs text-[var(--color-fg-muted)]">{unratedCompleted.pickupLocation} → {unratedCompleted.destination}</p>
				<div class="mt-3 flex gap-2">
					{#each [1, 2, 3, 4, 5] as star (star)}
						<button onclick={() => (ratingValue = star)} class="btn-press text-2xl {star <= ratingValue ? 'text-amber-400' : 'text-gray-300'}">★</button>
					{/each}
				</div>
				<textarea bind:value={comment} placeholder="Leave a comment (optional)" rows="2"
					class="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)]/50 outline-none focus:border-[var(--color-accent)]"></textarea>
				<button onclick={() => submitRating(unratedCompleted.id)}
					class="btn-press tap-target mt-3 w-full rounded-lg bg-[var(--color-accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">
					Submit rating
				</button>
			</div>

		{:else}
			<div class="enter-fade card-surface rounded-2xl p-5 shadow-sm">
				<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Book a ride</h2>
				<div class="mt-4 space-y-3">
					<div>
						<label for="pickup" class="mb-1.5 block text-xs font-medium text-[var(--color-fg-muted)]">Pickup location</label>
						<select id="pickup" bind:value={pickup} class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]">
							{#each CAMPUS_LOCATIONS as loc (loc.name)}<option value={loc.name}>{loc.name}</option>{/each}
						</select>
					</div>
					<div>
						<label for="destination" class="mb-1.5 block text-xs font-medium text-[var(--color-fg-muted)]">Destination</label>
						<select id="destination" bind:value={destination} class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]">
							{#each CAMPUS_LOCATIONS as loc (loc.name)}<option value={loc.name}>{loc.name}</option>{/each}
						</select>
					</div>
				</div>

				{#if sameLocation}
					<p class="mt-3 text-xs text-amber-600">Pickup and destination can't be the same.</p>
				{:else}
					<div class="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
						<div>
							<p class="text-xs text-[var(--color-fg-muted)]">Estimated fare · {distanceKm.toFixed(1)} km</p>
							<p class="font-heading text-lg font-semibold text-[var(--color-accent)]">₦{fare}</p>
						</div>
					</div>
				{/if}

				<button onclick={confirmBooking} disabled={booking || sameLocation}
					class="btn-press tap-target mt-4 w-full rounded-lg bg-[var(--color-accent)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-60">
					{booking ? 'Booking…' : 'Confirm booking'}
				</button>
			</div>
		{/if}
	</div>
</div>