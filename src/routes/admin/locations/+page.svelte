<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { pushToast } from '$lib/components/toast.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let name = $state('');
	let lat = $state('');
	let lng = $state('');
	let saving = $state(false);

	function openNew() {
		editingId = null; name = ''; lat = ''; lng = ''; showForm = true;
	}
	function openEdit(loc: any) {
		editingId = loc.id; name = loc.name; lat = String(loc.lat); lng = String(loc.lng); showForm = true;
	}

	async function save() {
		if (!name || !lat || !lng) return;
		saving = true;
		try {
			const body = JSON.stringify({ name, lat: Number(lat), lng: Number(lng) });
			const res = editingId
				? await fetch(`/api/locations/${editingId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body })
				: await fetch('/api/locations', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
			if (res.ok) {
				pushToast(editingId ? 'Location updated.' : 'Location added.', 'success');
				showForm = false;
				await invalidateAll();
			} else {
				const result = await res.json();
				pushToast(result.error ?? 'Could not save location.', 'error');
			}
		} finally { saving = false; }
	}

	async function remove(id: string) {
		if (!confirm('Remove this location? Existing bookings that used it are unaffected.')) return;
		const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
		if (res.ok) { pushToast('Location removed.', 'success'); await invalidateAll(); }
		else { pushToast('Could not remove location.', 'error'); }
	}
</script>

<svelte:head><title>Locations — TrikRide Admin</title></svelte:head>

<div class="flex items-start justify-between gap-4">
	<div>
		<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Locations</h1>
		<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Campus pickup and destination points offered on the booking form.</p>
	</div>
	<button onclick={openNew}
		class="btn-press tap-target shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">
		+ Add location
	</button>
</div>

<div class="card-surface mt-6 overflow-x-auto rounded-2xl shadow-sm">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-[var(--color-border)] text-xs text-[var(--color-fg-muted)]">
				<th class="px-4 py-3 font-medium">Name</th>
				<th class="px-4 py-3 font-medium">Latitude</th>
				<th class="px-4 py-3 font-medium">Longitude</th>
				<th class="px-4 py-3 font-medium text-right">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.locations as loc (loc.id)}
				<tr class="border-b border-[var(--color-border)] last:border-0">
					<td class="px-4 py-3 font-medium text-[var(--color-fg)]">{loc.name}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{loc.lat}</td>
					<td class="px-4 py-3 text-[var(--color-fg-muted)]">{loc.lng}</td>
					<td class="px-4 py-3 text-right">
						<button onclick={() => openEdit(loc)} class="text-xs font-medium text-[var(--color-accent)] hover:underline">Edit</button>
						<button onclick={() => remove(loc.id)} class="ml-3 text-xs font-medium text-red-600 hover:underline">Remove</button>
					</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="px-4 py-8 text-center text-[var(--color-fg-muted)]">No locations yet — add the first one, or run <code>npm run seed:admin</code> to load the campus defaults.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

{#if showForm}
	<div class="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center" onclick={() => (showForm = false)} role="presentation">
		<div class="enter-fade card-surface w-full max-w-sm rounded-2xl p-5 shadow-xl" onclick={(e) => e.stopPropagation()} role="presentation">
			<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">{editingId ? 'Edit location' : 'Add location'}</h2>
			<div class="mt-3 space-y-3">
				<input bind:value={name} placeholder="Name (e.g. Faculty of Science)" maxlength="100"
					class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]" />
				<div class="grid grid-cols-2 gap-2">
					<input bind:value={lat} placeholder="Latitude" inputmode="decimal"
						class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]" />
					<input bind:value={lng} placeholder="Longitude" inputmode="decimal"
						class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]" />
				</div>
			</div>
			<div class="mt-4 flex gap-2">
				<button onclick={() => (showForm = false)}
					class="btn-press tap-target h-11 flex-1 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)]">
					Cancel
				</button>
				<button onclick={save} disabled={saving || !name || !lat || !lng}
					class="btn-press tap-target h-11 flex-[2] rounded-xl bg-[var(--color-accent)] text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-60">
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}
