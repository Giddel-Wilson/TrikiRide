<script lang="ts">
	import { pushToast } from '$lib/components/toast.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let tab = $state<'riders' | 'students'>('riders');

	let expandedRider    = $state<string | null>(null);
	let riderReviews     = $state<Record<string, any[]>>({});
	let reviewPages      = $state<Record<string, number>>({});
	let reviewTotalPages = $state<Record<string, number>>({});
	let pendingRiderAction = $state<{ id: string; action: 'suspend' | 'delete'; name: string } | null>(null);
	let actionBusy = $state(false);

	async function riderAction(id: string, action: 'suspend' | 'delete') {
		actionBusy = true;
		try {
			const res = await fetch('/api/admin/users', {
				method: 'PATCH', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userType: 'rider', id, action })
			});
			if (res.ok) {
				pushToast(action === 'suspend' ? 'Rider suspended' : 'Rider removed', 'success');
				pendingRiderAction = null;
				await invalidateAll();
			} else { pushToast('Action failed.', 'error'); }
		} catch {
			pushToast('Action failed. Check your connection and try again.', 'error');
		} finally {
			actionBusy = false;
		}
	}

	function confirmRiderAction(id: string, action: 'suspend' | 'delete', name: string) {
		pendingRiderAction = { id, action, name };
	}

	async function reviewVerification(requestId: string, decision: 'approved' | 'declined') {
		const res = await fetch('/api/admin/verification', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId, decision }) });
		if (!res.ok) { pushToast('Could not review request.', 'error'); return; }
		pushToast(decision === 'approved' ? 'Rider verified' : 'Verification declined', 'success');
		await invalidateAll();
	}

	async function toggleReviews(riderId: string) {
		if (expandedRider === riderId) { expandedRider = null; return; }
		await fetchReviews(riderId, 1);
		expandedRider = riderId;
	}

	async function fetchReviews(riderId: string, page: number) {
		const res = await fetch(`/api/riders/${riderId}/reviews?page=${page}`);
		if (res.ok) {
			const d = await res.json();
			riderReviews     = { ...riderReviews,     [riderId]: d.reviews };
			reviewPages      = { ...reviewPages,      [riderId]: d.page };
			reviewTotalPages = { ...reviewTotalPages, [riderId]: d.totalPages };
		}
	}
</script>

<svelte:head><title>Manage users — TrikRide Admin</title></svelte:head>

<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Manage users</h1>

{#if data.requests.length}
	<section class="card-surface mt-5 rounded-2xl p-5 shadow-sm">
		<h2 class="font-heading text-base font-semibold">Rider KYC records ({data.requests.length})</h2>
		<p class="mt-1 text-xs text-[var(--color-fg-muted)]">Submitted identity documents and face scans remain available here for admin reference.</p>
		<div class="mt-3 space-y-3">
			{#each data.requests as request (request.id)}
				<div class="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-3">
					<div class="min-w-48 flex-1"><p class="font-medium">{request.fullname}</p><p class="text-xs text-[var(--color-fg-muted)]">{request.email} · {request.plateNumber ? `Plate ${request.plateNumber}` : request.serialNumber ? `Serial ${request.serialNumber}` : 'Vehicle number missing'} · {request.documentType === 'nin' ? 'NIN' : 'Driver’s licence'} · Submitted {new Date(request.createdAt).toLocaleDateString('en-NG')}</p>
						{#if request.reviewNotes}<p class="mt-1 text-xs text-[var(--color-fg-muted)]">Review note: {request.reviewNotes}</p>{/if}
					</div>
					<span class="rounded-full px-2 py-1 text-xs font-medium {request.status === 'approved' ? 'bg-green-100 text-green-700' : request.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">{request.status === 'approved' ? 'Approved' : request.status === 'declined' ? 'Declined' : 'Pending review'}</span>
					<a class="text-sm text-[var(--color-accent)] underline" href="/api/admin/verification?requestId={request.id}&file=document" target="_blank" rel="noreferrer">View ID</a>
					<a class="text-sm text-[var(--color-accent)] underline" href="/api/admin/verification?requestId={request.id}&file=face" target="_blank" rel="noreferrer">View face scan</a>
					{#if request.status === 'pending'}
						<button onclick={() => reviewVerification(request.id, 'approved')} class="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
						<button onclick={() => reviewVerification(request.id, 'declined')} class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">Decline</button>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

<div class="mt-5 grid w-fit grid-cols-2 gap-1.5 rounded-xl bg-[var(--color-surface-muted)] p-1">
	<button onclick={() => (tab = 'riders')} class="btn-press tap-target rounded-lg px-5 py-2 text-xs font-semibold {tab === 'riders' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-fg-muted)]'}">
		Riders ({data.riders.length})
	</button>
	<button onclick={() => (tab = 'students')} class="btn-press tap-target rounded-lg px-5 py-2 text-xs font-semibold {tab === 'students' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-fg-muted)]'}">
		Passengers ({data.students.length})
	</button>
</div>

{#if tab === 'riders'}
	<div class="card-surface mt-5 overflow-x-auto rounded-2xl p-5 shadow-sm">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="text-xs text-[var(--color-fg-muted)]">
					<th class="pb-2 font-medium">Name</th>
					<th class="pb-2 font-medium">Vehicle number</th>
					<th class="pb-2 font-medium">Trips & Rating</th>
					<th class="pb-2 font-medium">Earnings</th>
					<th class="pb-2 font-medium">Status</th>
					<th class="pb-2 font-medium">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.riders as r (r.id)}
					<tr class="border-t border-[var(--color-border)]">
						<td class="py-2.5 text-[var(--color-fg)]">{r.fullname}</td>
						<td class="py-2.5 text-[var(--color-fg-muted)]">{r.plateNumber ? `Plate ${r.plateNumber}` : r.serialNumber ? `Serial ${r.serialNumber}` : 'Not provided'}</td>
						<td class="py-2.5">
							<button onclick={() => toggleReviews(r.id)}
								class="text-xs font-medium text-[var(--color-accent)] hover:underline">
								★ {r.avgRating} · {r.totalTrips} trips
							</button>
						</td>
						<td class="py-2.5 text-[var(--color-fg-muted)]">₦{r.totalEarnings}</td>
						<td class="py-2.5">
							<span class="rounded-full px-2 py-0.5 text-xs {r.isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
								{r.isVerified ? 'Verified' : 'Unverified'}
							</span>
						</td>
						<td class="py-2.5">
							<div class="flex gap-2">
								{#if r.isVerified}
									<button onclick={() => confirmRiderAction(r.id, 'suspend', r.fullname)} class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">Suspend</button>
								{/if}
								<button onclick={() => confirmRiderAction(r.id, 'delete', r.fullname)} class="btn-press tap-target rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Remove</button>
							</div>
						</td>
					</tr>
					{#if expandedRider === r.id && riderReviews[r.id]}
						<tr>
							<td colspan="6" class="pb-4 pt-1">
								<div class="rounded-xl bg-[var(--color-surface-muted)] p-4">
									<p class="mb-3 text-xs font-semibold text-[var(--color-fg)]">Reviews for {r.fullname.split(' ')[0]}</p>
									{#if riderReviews[r.id].length === 0}
										<p class="text-xs text-[var(--color-fg-muted)]">No reviews yet.</p>
									{:else}
										<div class="space-y-2">
											{#each riderReviews[r.id] as review (review.id)}
												<div class="flex items-start gap-3 rounded-lg bg-[var(--color-surface)] p-3">
													<p class="shrink-0 text-sm text-amber-500">{'★'.repeat(review.passengerRating)}{'☆'.repeat(5 - review.passengerRating)}</p>
													<div>
														<p class="text-xs font-medium text-[var(--color-fg)]">{review.student.fullname}</p>
														{#if review.passengerComment}
															<p class="mt-0.5 text-xs text-[var(--color-fg-muted)]">{review.passengerComment}</p>
														{/if}
													</div>
													<p class="ml-auto shrink-0 text-xs text-[var(--color-fg-muted)]">
														{new Date(review.completedAt).toLocaleDateString('en-NG')}
													</p>
												</div>
											{/each}
										</div>
										{#if reviewTotalPages[r.id] > 1}
											<div class="mt-3 flex items-center justify-between">
												<button
													disabled={reviewPages[r.id] <= 1}
													onclick={() => fetchReviews(r.id, reviewPages[r.id] - 1)}
													class="text-xs font-medium text-[var(--color-accent)] disabled:opacity-40 hover:underline">
													← Prev
												</button>
												<p class="text-xs text-[var(--color-fg-muted)]">Page {reviewPages[r.id]} of {reviewTotalPages[r.id]}</p>
												<button
													disabled={reviewPages[r.id] >= reviewTotalPages[r.id]}
													onclick={() => fetchReviews(r.id, reviewPages[r.id] + 1)}
													class="text-xs font-medium text-[var(--color-accent)] disabled:opacity-40 hover:underline">
													Next →
												</button>
											</div>
										{/if}
									{/if}
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="card-surface mt-5 overflow-x-auto rounded-2xl p-5 shadow-sm">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="text-xs text-[var(--color-fg-muted)]">
					<th class="pb-2 font-medium">Name</th><th class="pb-2 font-medium">Email</th>
					<th class="pb-2 font-medium">Phone</th><th class="pb-2 font-medium">Joined</th>
				</tr>
			</thead>
			<tbody>
				{#each data.students as s (s.id)}
					<tr class="border-t border-[var(--color-border)]">
						<td class="py-2.5 text-[var(--color-fg)]">{s.fullname}</td>
						<td class="py-2.5 text-[var(--color-fg-muted)]">{s.email}</td>
						<td class="py-2.5 text-[var(--color-fg-muted)]">{s.phone}</td>
						<td class="py-2.5 text-[var(--color-fg-muted)]">{new Date(s.regDate).toLocaleDateString('en-NG')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if pendingRiderAction}
	<div class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onclick={(event) => { if (event.target === event.currentTarget && !actionBusy) pendingRiderAction = null; }}>
		<div role="dialog" aria-modal="true" aria-labelledby="rider-action-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
			<h2 id="rider-action-title" class="font-heading text-lg font-semibold text-[var(--color-fg)]">{pendingRiderAction.action === 'delete' ? 'Remove rider?' : 'Suspend rider?'}</h2>
			<p class="mt-2 text-sm text-[var(--color-fg-muted)]">{pendingRiderAction.action === 'delete' ? `This will permanently remove ${pendingRiderAction.name} and their rider account data.` : `This will suspend ${pendingRiderAction.name} and revoke their verification.`}</p>
			<div class="mt-6 flex justify-end gap-3">
				<button onclick={() => pendingRiderAction = null} disabled={actionBusy} class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-fg-muted)] disabled:opacity-50">Cancel</button>
				<button onclick={() => pendingRiderAction && riderAction(pendingRiderAction.id, pendingRiderAction.action)} disabled={actionBusy} class="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 {pendingRiderAction.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)]'}">{actionBusy ? 'Working…' : pendingRiderAction.action === 'delete' ? 'Remove rider' : 'Suspend rider'}</button>
			</div>
		</div>
	</div>
{/if}
