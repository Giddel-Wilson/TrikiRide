<script lang="ts">
	let { data } = $props();
</script>
<svelte:head><title>Profile — TrikRide</title></svelte:head>
<h1 class="font-heading text-xl font-semibold text-[var(--color-fg)]">Your profile</h1>
<div class="enter-fade card-surface mt-6 max-w-md rounded-2xl p-6 shadow-sm">
	<div class="flex items-center gap-4">
		<div class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 font-heading text-lg font-semibold text-[var(--color-accent)]">
			{data.user.fullname.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
		</div>
		<div>
			<p class="font-heading text-base font-semibold text-[var(--color-fg)]">{data.user.fullname}</p>
			<p class="text-sm text-[var(--color-fg-muted)]">Passenger account</p>
		</div>
	</div>
</div>
