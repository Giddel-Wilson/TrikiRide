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
		{ href: '/admin/users', label: 'Manage users', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z' },
		{ href: '/admin/payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-9 4h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z' },
		{ href: '/admin/locations', label: 'Locations', icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
		{ href: '/admin/complaints', label: 'Complaints', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
		{ href: '/admin/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
		{ href: '/admin/audit', label: 'Audit log', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
		{ href: '/admin/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' }
	];
</script>

<div class="min-h-screen bg-[var(--color-bg)] md:flex">
	<aside class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:flex">
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
