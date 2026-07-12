<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	let { data } = $props();
	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>
<svelte:head><title>Ride history — TrikRide</title></svelte:head>
<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Ride history</h1>
<p class="mt-1 text-sm text-[var(--color-fg-muted)]">All your trips, routes, and fares.</p>
<div class="mt-6 space-y-3">
	{#each data.bookings as b, i (b.id)}
		<div class="stagger-item card-surface rounded-xl p-4 shadow-sm" style="animation-delay: {i * 40}ms">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-sm font-medium text-[var(--color-fg)]">{b.pickupLocation} → {b.destination}</p>
					<p class="mt-1 text-xs text-[var(--color-fg-muted)]">{formatDate(b.bookingTime)}</p>
					{#if b.rider}<p class="mt-1 text-xs text-[var(--color-fg-muted)]">Rider: {b.rider.fullname} · {b.rider.plateNumber}</p>{/if}
				</div>
				<div class="text-right">
					<p class="font-heading text-sm font-semibold text-[var(--color-accent)]">₦{b.fare}</p>
					<div class="mt-1.5"><StatusBadge status={b.bookingStatus} /></div>
				</div>
			</div>
			{#if b.passengerRating}
				<p class="mt-2 text-xs text-amber-500">{'★'.repeat(b.passengerRating)}{'☆'.repeat(5 - b.passengerRating)}</p>
			{/if}
		</div>
	{:else}
		<div class="card-tinted rounded-xl p-8 text-center text-sm text-[var(--color-fg-muted)]">No rides yet — your booking history will show up here.</div>
	{/each}
</div>
