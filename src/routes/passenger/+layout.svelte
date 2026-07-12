<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import ToastHost from '$lib/components/ToastHost.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto('/');
	}

	const tabs = [
		{ href: '/passenger', label: 'Book a ride' },
		{ href: '/passenger/history', label: 'Ride history' },
		{ href: '/passenger/profile', label: 'Profile' }
	];
</script>

<div class="min-h-screen bg-[var(--color-bg)]">
	<header class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
			<a href="/passenger"><Logo /></a>
			<nav class="hidden items-center gap-1 md:flex">
				{#each tabs as t (t.href)}
					<a href={t.href}
						class="btn-press tap-target rounded-lg px-3 py-2 text-sm font-medium transition {page.url.pathname === t.href
							? 'bg-[var(--color-surface)] text-[var(--color-accent)] font-semibold'
							: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}">
						{t.label}
					</a>
				{/each}
			</nav>
			<div class="flex items-center gap-3">
				<span class="hidden text-sm text-[var(--color-fg-muted)] sm:inline">Hi, {data.user.fullname.split(' ')[0]}</span>
				<button onclick={logout} class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
					Log out
				</button>
			</div>
		</div>
		<nav class="flex items-center gap-1 overflow-x-auto px-5 pb-2 md:hidden">
			{#each tabs as t (t.href)}
				<a href={t.href} class="btn-press tap-target rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap {page.url.pathname === t.href ? 'bg-[var(--color-surface)] text-[var(--color-accent)]' : 'text-[var(--color-fg-muted)]'}">
					{t.label}
				</a>
			{/each}
		</nav>
	</header>
	<main class="mx-auto max-w-5xl px-5 py-8">{@render children()}</main>
</div>
<ToastHost />
