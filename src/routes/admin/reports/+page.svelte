<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	function setRange(r: string) {
		goto(`/admin/reports?range=${r}`, { keepFocus: true, noScroll: true });
	}

	function exportCsv() {
		const header = 'Day,Bookings,Completed,Revenue (NGN)\n';
		const rows = data.daily.map((d: any) => `${d.day},${d.bookings},${d.completed},${d.revenue}`).join('\n');
		const blob = new Blob([header + rows], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = `trikride-report-${data.range}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head><title>Reports — TrikRide Admin</title></svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4">
	<div>
		<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Reports</h1>
		<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Booking, earnings, and user-activity summary.</p>
	</div>
	<div class="flex items-center gap-2">
		<div class="flex gap-1 rounded-lg bg-[var(--color-surface-muted)] p-1">
			{#each [['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']] as [value, label] (value)}
				<button onclick={() => setRange(value)}
					class="btn-press tap-target rounded-md px-3 py-1.5 text-xs font-medium transition {data.range === value
						? 'bg-[var(--color-accent)] text-white'
						: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}">
					{label}
				</button>
			{/each}
		</div>
		<button onclick={exportCsv}
			class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface-muted)]">
			Export CSV
		</button>
	</div>
</div>

<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Bookings</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">{data.totals.bookings}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Completed</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">{data.totals.completed}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Cancelled</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">{data.totals.cancelled}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Revenue</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">₦{data.totals.totalRevenue.toLocaleString()}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">Avg. fare</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">₦{Math.round(data.totals.avgFare)}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">New students</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">{data.totals.newStudents}</p>
	</div>
	<div class="card-surface rounded-xl p-4 shadow-sm">
		<p class="text-xs text-[var(--color-fg-muted)]">New riders</p>
		<p class="mt-1 font-heading text-lg font-semibold text-[var(--color-fg)]">{data.totals.newRiders}</p>
	</div>
</div>

<div class="card-surface mt-6 overflow-x-auto rounded-2xl shadow-sm">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]">
				<th class="px-4 py-3 font-medium">Day</th>
				<th class="px-4 py-3 font-medium">Bookings</th>
				<th class="px-4 py-3 font-medium">Completed</th>
				<th class="px-4 py-3 font-medium">Revenue</th>
			</tr>
		</thead>
		<tbody>
			{#each data.daily as d (d.day)}
				<tr class="border-b border-[var(--color-border)] last:border-0">
					<td class="px-4 py-3 text-[var(--color-fg)]">{d.day}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{d.bookings}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{d.completed}</td>
					<td class="px-4 py-3 font-medium text-[var(--color-accent)]">₦{d.revenue.toLocaleString()}</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="px-4 py-8 text-center text-[var(--color-fg-muted)]">No bookings in this range.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
