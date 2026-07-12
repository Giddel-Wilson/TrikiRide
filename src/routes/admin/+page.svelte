<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getPusher } from '$lib/pusher';

	let { data } = $props();

	const maxCount = $derived(Math.max(...data.weekChart.map((d: any) => d.count), 1));
	const kpis = $derived([
		{ label: 'Total students',  value: data.totalStudents },
		{ label: 'Active riders',   value: `${data.activeRiders}/${data.totalRiders}` },
		{ label: 'Bookings today',  value: data.bookingsToday },
		{ label: 'Revenue today',   value: `₦${data.revenueToday}` }
	]);

	onMount(async () => {
		const pusherClient = await getPusher();
		if (!pusherClient) return;

		const channel = pusherClient.subscribe('admin');
		channel.bind('booking-updated', () => invalidateAll());

		return () => pusherClient.unsubscribe('admin');
	});
</script>

<svelte:head><title>Admin dashboard — TrikRide</title></svelte:head>

<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Dashboard</h1>
<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Operational overview of TrikRide.</p>

<div class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
	{#each kpis as kpi, i (kpi.label)}
		<div class="stagger-item card-tinted rounded-xl p-4 shadow-sm" style="animation-delay: {i * 50}ms">
			<p class="text-xs text-[var(--color-fg-muted)]">{kpi.label}</p>
			<p class="font-heading mt-1 text-xl font-semibold text-[var(--color-fg)]">{kpi.value}</p>
		</div>
	{/each}
</div>

<div class="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
	<div class="card-surface rounded-2xl p-5 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Recent bookings</h2>
			<a href="/admin/bookings" class="text-xs font-medium text-[var(--color-accent)] hover:underline">View all</a>
		</div>
		<div class="mt-4 overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="text-xs text-[var(--color-fg-muted)]">
						<th class="pb-2 font-medium">Student</th>
						<th class="pb-2 font-medium">Rider</th>
						<th class="pb-2 font-medium">Route</th>
						<th class="pb-2 font-medium">Fare</th>
						<th class="pb-2 font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.recentBookings as b (b.id)}
						<tr class="border-t border-[var(--color-border)]">
							<td class="py-2.5 text-[var(--color-fg)]">{b.student.fullname}</td>
							<td class="py-2.5 text-[var(--color-fg-muted)]">{b.rider?.fullname ?? '—'}</td>
							<td class="py-2.5 text-[var(--color-fg-muted)]">{b.pickupLocation} → {b.destination}</td>
							<td class="py-2.5 text-[var(--color-accent)] font-medium">₦{b.fare}</td>
							<td class="py-2.5"><StatusBadge status={b.bookingStatus} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="card-surface rounded-2xl p-5 shadow-sm">
		<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Weekly bookings</h2>
		<div class="mt-6 flex h-40 items-end gap-2.5">
			{#each data.weekChart as d, i (d.label)}
				<div class="flex flex-1 flex-col items-center gap-2">
					<div class="stagger-item w-full rounded-t-md bg-[var(--color-accent)]"
						style="height: {Math.max((d.count / maxCount) * 100, 4)}%; animation-delay: {i * 60}ms"></div>
					<span class="text-[10px] text-[var(--color-fg-muted)]">{d.label}</span>
				</div>
			{/each}
		</div>
	</div>
</div>