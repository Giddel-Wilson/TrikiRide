<script lang="ts">
	import AuthHero from '$lib/components/auth/AuthHero.svelte';
	import InputGroup from '$lib/components/auth/InputGroup.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let role = $state<'passenger' | 'rider' | 'admin'>(
		(page.url.searchParams.get('as') as 'passenger' | 'rider' | 'admin') ?? 'passenger'
	);
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	const roleLabels: Record<string, string> = {
		passenger: 'Passenger', rider: 'Rider', admin: 'Administrator'
	};
	const roleDestinations: Record<string, string> = {
		passenger: '/passenger', rider: '/rider', admin: '/admin'
	};

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password, role })
			});
			const data = await res.json();
			if (!res.ok) { errorMsg = data.error ?? 'Something went wrong.'; return; }
			await goto(roleDestinations[role]);
		} finally { loading = false; }
	}
</script>

<svelte:head><title>Log in — TrikRide</title></svelte:head>

<main class="flex min-h-screen w-full bg-[var(--color-bg)] selection:bg-[var(--color-accent)]/20 p-2 transition-all duration-500 lg:h-screen lg:p-4">
	<AuthHero heading="Welcome back" description="Log in to track your ride, manage trips, and keep moving around campus.">
		<div class="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
			<span class="h-2 w-2 rounded-full bg-green-400"></span>
			<span class="text-sm font-medium text-white/70">12 riders online right now</span>
		</div>
		<div class="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
			<span class="h-2 w-2 rounded-full bg-[var(--color-accent)]"></span>
			<span class="text-sm font-medium text-white/70">Fixed, transparent campus fares</span>
		</div>
	</AuthHero>

	<div class="flex flex-1 flex-col items-center overflow-y-auto bg-[var(--color-bg)] px-4 py-12 sm:px-12 lg:justify-center lg:px-16 lg:py-10 xl:px-24">
		<div class="enter-fade w-full max-w-xl space-y-7">
			<a href="/" class="mb-2 flex justify-center lg:hidden"><Logo /></a>

			<div>
				<h2 class="font-heading text-3xl font-medium tracking-tight text-[var(--color-fg)]">Log in to TrikRide</h2>
				<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Choose your role and enter your details.</p>
			</div>

			<div class="grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--color-surface-muted)] p-1">
				{#each ['passenger', 'rider', 'admin'] as r (r)}
					<button
						type="button"
						class="btn-press tap-target rounded-lg py-2 text-xs font-semibold transition {role === r
							? 'bg-[var(--color-accent)] text-white'
							: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}"
						onclick={() => (role = r as typeof role)}
					>
						{roleLabels[r]}
					</button>
				{/each}
			</div>

			<form class="space-y-5" onsubmit={submit}>
				<InputGroup id="email" label="Email address" type="email" placeholder="you@uniport.edu.ng" bind:value={email} required />
				<InputGroup id="password" label="Password" type="password" placeholder="••••••••" bind:value={password} required />

				{#if errorMsg}
					<p class="enter-fade rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{errorMsg}</p>
				{/if}

				<button type="submit" disabled={loading}
					class="btn-press tap-target mt-4 h-14 w-full rounded-xl bg-[var(--color-accent)] font-semibold text-white hover:bg-[var(--color-accent-dark)] active:scale-[0.98] disabled:opacity-60">
					{loading ? 'Signing in…' : 'Log in'}
				</button>
			</form>

			<p class="text-center text-sm text-[var(--color-fg-muted)]">
				New to TrikRide? <a href="/register?role={role === 'admin' ? 'passenger' : role}" class="font-semibold text-[var(--color-accent)] hover:underline">Create an account</a>
			</p>
		</div>
	</div>
</main>
