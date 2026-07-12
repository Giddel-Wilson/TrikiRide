<script lang="ts">
	import { pushToast } from '$lib/components/toast.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let tab = $state<'riders' | 'students'>('riders');

	let expandedRider    = $state<string | null>(null);
	let riderReviews     = $state<Record<string, any[]>>({});
	let reviewPages      = $state<Record<string, number>>({});
	let reviewTotalPages = $state<Record<string, number>>({});

	async function riderAction(id: string, action: 'verify' | 'suspend' | 'delete') {
		const res = await fetch('/api/admin/users', {
			method: 'PATCH', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userType: 'rider', id, action })
		});
		if (res.ok) {
			pushToast(action === 'verify' ? 'Rider verified' : action === 'suspend' ? 'Rider suspended' : 'Rider removed', 'success');
			await invalidateAll();
		} else { pushToast('Action failed.', 'error'); }
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
					<th class="pb-2 font-medium">Plate</th>
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
						<td class="py-2.5 text-[var(--color-fg-muted)]">{r.plateNumber}</td>
						<td class="py-2.5">
							<button onclick={() => toggleReviews(r.id)}
								class="text-xs font-medium text-[var(--color-accent)] hover:underline">
								★ {r.avgRating} · {r.totalTrips} trips
							</button>
						</td>
						<td class="py-2.5 text-[var(--color-fg-muted)]">₦{r.totalEarnings}</td>
						<td class="py-2.5">
							<span class="rounded-full px-2 py-0.5 text-xs {r.isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
								{r.isVerified ? 'Verified' : 'Pending'}
							</span>
						</td>
						<td class="py-2.5">
							<div class="flex gap-2">
								{#if !r.isVerified}
									<button onclick={() => riderAction(r.id, 'verify')} class="btn-press tap-target rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-accent-dark)]">Verify</button>
								{:else}
									<button onclick={() => riderAction(r.id, 'suspend')} class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">Suspend</button>
								{/if}
								<button onclick={() => riderAction(r.id, 'delete')} class="btn-press tap-target rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Remove</button>
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