<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	let { data } = $props();
	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

<svelte:head><title>Payments — TrikRide Admin</title></svelte:head>

<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Payments</h1>
<p class="mt-1 text-sm text-[var(--color-fg-muted)]">
	Payment records across every booking. TrikRide doesn't process wallet or transfer payments yet — riders and passengers settle those in person, and this page is a record of what was reported.
</p>

<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Total revenue</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">₦{data.totalRevenue.toLocaleString()}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Cash</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">₦{(data.byMethod.cash ?? 0).toLocaleString()}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Transfer</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">₦{(data.byMethod.transfer ?? 0).toLocaleString()}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Wallet</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">₦{(data.byMethod.wallet ?? 0).toLocaleString()}</p>
	</div>
</div>

<div class="card-surface mt-6 overflow-x-auto rounded-2xl shadow-sm">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]">
				<th class="px-4 py-3 font-medium">Student</th>
				<th class="px-4 py-3 font-medium">Rider</th>
				<th class="px-4 py-3 font-medium">Route</th>
				<th class="px-4 py-3 font-medium">Amount</th>
				<th class="px-4 py-3 font-medium">Method</th>
				<th class="px-4 py-3 font-medium">Status</th>
				<th class="px-4 py-3 font-medium">Paid at</th>
			</tr>
		</thead>
		<tbody>
			{#each data.payments as p (p.id)}
				<tr class="border-b border-[var(--color-border)] last:border-0">
					<td class="px-4 py-3 text-[var(--color-fg)]">{p.booking?.student?.fullname ?? '—'}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{p.booking?.rider?.fullname ?? '—'}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{p.booking ? `${p.booking.pickupLocation} → ${p.booking.destination}` : '—'}</td>
					<td class="px-4 py-3 font-medium text-[var(--color-accent)]">₦{p.amount}</td>
					<td class="px-4 py-3 capitalize text-[var(--color-fg-muted)]">{p.method}</td>
					<td class="px-4 py-3"><StatusBadge status={p.status} /></td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
				</tr>
			{:else}
				<tr><td colspan="7" class="px-4 py-8 text-center text-[var(--color-fg-muted)]">No payments yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
