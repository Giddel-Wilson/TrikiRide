<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { pushToast } from '$lib/components/toast.svelte';

	let { data } = $props();

	let filter = $state<'open' | 'resolved' | 'dismissed' | 'all'>('open');
	const filtered = $derived(filter === 'all' ? data.complaints : data.complaints.filter((c: any) => c.status === filter));

	let respondingId = $state<string | null>(null);
	let response = $state('');
	let acting = $state(false);

	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	async function resolve(id: string, status: 'resolved' | 'dismissed') {
		acting = true;
		try {
			const res = await fetch(`/api/complaints/${id}`, {
				method: 'PATCH', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status, adminResponse: response || undefined })
			});
			if (res.ok) {
				pushToast(status === 'resolved' ? 'Marked as resolved.' : 'Dismissed.', 'success');
				respondingId = null; response = '';
				await invalidateAll();
			} else { pushToast('Could not update complaint.', 'error'); }
		} finally { acting = false; }
	}

	const statusStyles: Record<string, string> = {
		open: 'bg-amber-100 text-amber-700 border-amber-200',
		resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
		dismissed: 'bg-gray-100 text-gray-600 border-gray-200'
	};
</script>

<svelte:head><title>Complaints — TrikRide Admin</title></svelte:head>

<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Complaints</h1>
<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Issues reported by passengers and riders about a trip.</p>

<div class="mt-4 flex gap-1 rounded-lg bg-[var(--color-surface-muted)] p-1 w-fit">
	{#each [['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['all', 'All']] as [value, label] (value)}
		<button onclick={() => (filter = value as typeof filter)}
			class="btn-press tap-target rounded-md px-3 py-1.5 text-xs font-medium transition {filter === value
				? 'bg-[var(--color-accent)] text-white'
				: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}">
			{label}
		</button>
	{/each}
</div>

<div class="mt-4 space-y-3">
	{#each filtered as c (c.id)}
		<div class="card-surface rounded-xl p-4 shadow-sm">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<p class="text-sm font-semibold text-[var(--color-fg)]">{c.subject}</p>
						<span class="rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize {statusStyles[c.status]}">{c.status}</span>
					</div>
					<p class="mt-1 text-xs text-[var(--color-fg-muted)]">
						{c.filedByName} ({c.filedByType}) · {formatDate(c.createdAt)}
						{#if c.booking}· {c.booking.pickupLocation} → {c.booking.destination}{/if}
					</p>
					<p class="mt-2 text-sm text-[var(--color-fg)]">{c.description}</p>
					{#if c.adminResponse}
						<p class="mt-2 rounded-lg bg-[var(--color-surface-muted)] p-2.5 text-xs text-[var(--color-fg-muted)]"><span class="font-medium text-[var(--color-fg)]">Admin response:</span> {c.adminResponse}</p>
					{/if}
				</div>
			</div>

			{#if c.status === 'open'}
				{#if respondingId === c.id}
					<textarea bind:value={response} placeholder="Optional response to the person who filed this…" rows="2"
						class="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"></textarea>
					<div class="mt-2 flex gap-2">
						<button onclick={() => resolve(c.id, 'resolved')} disabled={acting}
							class="btn-press tap-target rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-60">
							Mark resolved
						</button>
						<button onclick={() => resolve(c.id, 'dismissed')} disabled={acting}
							class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-3.5 py-2 text-xs font-medium text-[var(--color-fg)] disabled:opacity-60">
							Dismiss
						</button>
						<button onclick={() => { respondingId = null; response = ''; }}
							class="text-xs font-medium text-[var(--color-fg-muted)] hover:underline">
							Cancel
						</button>
					</div>
				{:else}
					<button onclick={() => { respondingId = c.id; response = ''; }}
						class="btn-press tap-target mt-3 rounded-lg border border-[var(--color-border)] px-3.5 py-2 text-xs font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface-muted)]">
						Respond
					</button>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="card-tinted rounded-xl p-8 text-center text-sm text-[var(--color-fg-muted)]">No {filter === 'all' ? '' : filter} complaints.</div>
	{/each}
</div>
