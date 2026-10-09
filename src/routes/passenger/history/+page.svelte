<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { pushToast } from '$lib/components/toast.svelte';

	let { data } = $props();
	function formatDate(d: string | Date) {
		return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
	}

	let reportingBookingId = $state<string | null>(null);
	let reportSubject       = $state('');
	let reportDescription   = $state('');
	let submittingReport    = $state(false);
	async function submitReport() {
		if (!reportingBookingId || !reportSubject || !reportDescription) return;
		submittingReport = true;
		try {
			const res = await fetch('/api/complaints', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ bookingId: reportingBookingId, subject: reportSubject, description: reportDescription })
			});
			if (res.ok) {
				pushToast('Report submitted — an admin will review it.', 'success');
				reportingBookingId = null; reportSubject = ''; reportDescription = '';
			} else { pushToast('Could not submit report.', 'error'); }
		} finally { submittingReport = false; }
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
					{#if b.rider}<p class="mt-1 text-xs text-[var(--color-fg-muted)]">Rider: {b.rider.fullname} · {b.rider.serialNumber}</p>{/if}
				</div>
				<div class="text-right">
					<p class="font-heading text-sm font-semibold text-[var(--color-accent)]">₦{b.fare}</p>
					<div class="mt-1.5"><StatusBadge status={b.bookingStatus} /></div>
				</div>
			</div>
			{#if b.passengerRating}
				<p class="mt-2 text-xs text-amber-500">{'★'.repeat(b.passengerRating)}{'☆'.repeat(5 - b.passengerRating)}</p>
			{/if}
			{#if b.bookingStatus === 'completed'}
				<button onclick={() => { reportingBookingId = b.id; reportSubject = ''; reportDescription = ''; }}
					class="mt-2 text-xs font-medium text-[var(--color-fg-muted)] hover:text-red-600 hover:underline">
					Report an issue
				</button>
			{/if}
		</div>
	{:else}
		<div class="card-tinted rounded-xl p-8 text-center text-sm text-[var(--color-fg-muted)]">No rides yet — your booking history will show up here.</div>
	{/each}
</div>

{#if reportingBookingId}
	<div class="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center" onclick={() => (reportingBookingId = null)} role="presentation">
		<div class="enter-fade card-surface w-full max-w-md rounded-2xl p-5 shadow-xl" onclick={(e) => e.stopPropagation()} role="presentation">
			<h2 class="font-heading text-sm font-semibold text-[var(--color-fg)]">Report an issue</h2>
			<p class="mt-1 text-xs text-[var(--color-fg-muted)]">This goes straight to a TrikRide admin for review.</p>
			<input bind:value={reportSubject} placeholder="Subject (e.g. Rider was rude)" maxlength="150"
				class="tap-target mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]" />
			<textarea bind:value={reportDescription} placeholder="What happened?" rows="4" maxlength="2000"
				class="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"></textarea>
			<div class="mt-3 flex gap-2">
				<button onclick={() => (reportingBookingId = null)}
					class="btn-press tap-target h-11 flex-1 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)]">
					Cancel
				</button>
				<button onclick={submitReport} disabled={submittingReport || !reportSubject || !reportDescription}
					class="btn-press tap-target h-11 flex-[2] rounded-xl bg-[var(--color-accent)] text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-60">
					{submittingReport ? 'Submitting…' : 'Submit report'}
				</button>
			</div>
		</div>
	</div>
{/if}
