<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	let { data } = $props();
	let filter = $state('all');
	const filtered = $derived(filter === 'all' ? data.bookings : data.bookings.filter((b: any) => b.bookingStatus === filter));
	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>
<svelte:head><title>All bookings — TrikRide Admin</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3">
	<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">All bookings</h1>
	<select bind:value={filter} class="tap-target rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]">
		<option value="all">All statuses</option>
		<option value="pending">Pending</option>
		<option value="accepted">Accepted</option>
		<option value="ongoing">Ongoing</option>
		<option value="completed">Completed</option>
		<option value="cancelled">Cancelled</option>
	</select>
</div>

<div class="card-surface mt-5 overflow-x-auto rounded-2xl p-5 shadow-sm">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="text-xs text-[var(--color-fg-muted)]">
				<th class="pb-2 font-medium">Date</th><th class="pb-2 font-medium">Student</th>
				<th class="pb-2 font-medium">Rider</th><th class="pb-2 font-medium">Route</th>
				<th class="pb-2 font-medium">Distance</th><th class="pb-2 font-medium">Fare</th>
				<th class="pb-2 font-medium">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each filtered as b (b.id)}
				<tr class="border-t border-[var(--color-border)]">
					<td class="py-2.5 text-[var(--color-fg-muted)]">{formatDate(b.bookingTime)}</td>
					<td class="py-2.5 text-[var(--color-fg)]">{b.student.fullname}</td>
					<td class="py-2.5 text-[var(--color-fg-muted)]">{b.rider?.fullname ?? '—'}</td>
					<td class="py-2.5 text-[var(--color-fg-muted)]">{b.pickupLocation} → {b.destination}</td>
					<td class="py-2.5 text-[var(--color-fg-muted)]">{b.distanceKm} km</td>
					<td class="py-2.5 text-[var(--color-accent)] font-medium">₦{b.fare}</td>
					<td class="py-2.5"><StatusBadge status={b.bookingStatus} /></td>
				</tr>
			{:else}
				<tr><td colspan="7" class="py-8 text-center text-[var(--color-fg-muted)]">No bookings found.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
