<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import ToastHost from '$lib/components/ToastHost.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();
	async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); await goto('/'); }

	const nav = [
		{ href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/admin/bookings', label: 'All bookings', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
		{ href: '/admin/users', label: 'Manage users', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z' }
	];
</script>

<div class="min-h-screen bg-[var(--color-bg)] md:flex">
	<aside class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:flex">
		<a href="/admin"><Logo /></a>
		<nav class="mt-8 flex flex-col gap-1">
			{#each nav as item (item.href)}
				<a href={item.href} class="btn-press tap-target flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition {page.url.pathname === item.href
					? 'bg-[var(--color-accent)] text-white'
					: 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-fg)]'}">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={item.icon} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mt-auto">
			<button onclick={logout} class="btn-press tap-target w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
				Log out
			</button>
		</div>
	</aside>

	<div class="flex-1">
		<header class="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-white/90 px-5 py-4 backdrop-blur md:hidden">
			<Logo size={22} />
			<button onclick={logout} class="text-sm text-[var(--color-fg-muted)]">Log out</button>
		</header>
		<main class="mx-auto max-w-6xl px-5 py-8">{@render children()}</main>
	</div>
</div>
<ToastHost />
