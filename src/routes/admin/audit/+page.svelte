<script lang="ts">
	let { data } = $props();

	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	const actionLabels: Record<string, string> = {
		verify_rider: 'Verified rider',
		suspend_rider: 'Suspended rider',
		delete_user: 'Deleted account',
		create_location: 'Added location',
		update_location: 'Updated location',
		delete_location: 'Removed location',
		update_fare_settings: 'Updated fare settings',
		resolve_complaint: 'Resolved complaint',
		dismiss_complaint: 'Dismissed complaint'
	};
	function label(action: string) {
		return actionLabels[action] ?? action.replace(/_/g, ' ');
	}
</script>

<svelte:head><title>Audit log — TrikRide Admin</title></svelte:head>

<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Audit log</h1>
<p class="mt-1 text-sm text-[var(--color-fg-muted)]">A record of every administrative action, most recent first.</p>

<div class="card-surface mt-6 overflow-x-auto rounded-2xl shadow-sm">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]">
				<th class="px-4 py-3 font-medium">When</th>
				<th class="px-4 py-3 font-medium">Admin</th>
				<th class="px-4 py-3 font-medium">Action</th>
				<th class="px-4 py-3 font-medium">Target</th>
				<th class="px-4 py-3 font-medium">Details</th>
			</tr>
		</thead>
		<tbody>
			{#each data.entries as e (e.id)}
				<tr class="border-b border-[var(--color-border)] last:border-0">
					<td class="px-4 py-3 whitespace-nowrap text-[var(--color-fg-muted)]">{formatDate(e.createdAt)}</td>
					<td class="px-4 py-3 text-[var(--color-fg)]">{e.adminName}</td>
					<td class="px-4 py-3 text-[var(--color-fg)]">{label(e.action)}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{e.targetType}{e.targetId ? ` · ${e.targetId.slice(0, 8)}` : ''}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{e.details ?? '—'}</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="px-4 py-8 text-center text-[var(--color-fg-muted)]">No admin actions logged yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
