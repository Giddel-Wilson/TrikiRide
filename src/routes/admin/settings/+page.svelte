<script lang="ts">
	import { pushToast } from '$lib/components/toast.svelte';
	import { estimateFare } from '$lib/utils/fare';

	let { data } = $props();

	let baseFare  = $state(String(data.fareSettings.baseFare));
	let ratePerKm = $state(String(data.fareSettings.ratePerKm));
	let saving    = $state(false);

	const previewFare = $derived(estimateFare(3, Number(baseFare) || 0, Number(ratePerKm) || 0));

	async function save() {
		saving = true;
		try {
			const res = await fetch('/api/admin/settings', {
				method: 'PATCH', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ baseFare: Number(baseFare), ratePerKm: Number(ratePerKm) })
			});
			if (res.ok) { pushToast('Fare settings updated.', 'success'); }
			else { pushToast('Could not save fare settings.', 'error'); }
		} finally { saving = false; }
	}
</script>

<svelte:head><title>Settings — TrikRide Admin</title></svelte:head>

<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Settings</h1>
<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Configure the fare engine used for every new booking.</p>

<div class="card-surface mt-6 max-w-md rounded-2xl p-5 shadow-sm">
	<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Fare rates</h2>
	<div class="mt-4 space-y-3">
		<div>
			<label for="baseFare" class="mb-1.5 block text-xs font-medium text-[var(--color-fg-muted)]">Base fare (₦)</label>
			<input id="baseFare" bind:value={baseFare} inputmode="decimal"
				class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]" />
		</div>
		<div>
			<label for="ratePerKm" class="mb-1.5 block text-xs font-medium text-[var(--color-fg-muted)]">Rate per km (₦)</label>
			<input id="ratePerKm" bind:value={ratePerKm} inputmode="decimal"
				class="tap-target w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]" />
		</div>
	</div>

	<div class="mt-4 rounded-xl bg-green-50 px-4 py-3">
		<p class="text-xs text-[var(--color-fg-muted)]">Preview · 3.0 km trip</p>
		<p class="font-heading text-lg font-semibold text-[var(--color-accent)]">₦{previewFare}</p>
	</div>

	<button onclick={save} disabled={saving || !baseFare || !ratePerKm}
		class="btn-press tap-target mt-4 w-full rounded-lg bg-[var(--color-accent)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-60">
		{saving ? 'Saving…' : 'Save changes'}
	</button>
	<p class="mt-2 text-[11px] text-[var(--color-fg-muted)]">Applies to bookings created after saving — it doesn't change fares already in progress.</p>
</div>
