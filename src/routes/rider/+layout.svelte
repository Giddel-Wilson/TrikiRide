<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import ToastHost from '$lib/components/ToastHost.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();

	async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); await goto('/'); }

	const tabs = [
		{ href: '/rider', label: 'Dashboard' },
		{ href: '/rider/history', label: 'Trip history' }
	];
</script>

<div class="min-h-screen bg-[var(--color-bg)]">
	<header class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
			<a href="/rider"><Logo /></a>
			<nav class="hidden items-center gap-1 md:flex">
				{#each tabs as t (t.href)}
					<a href={t.href} class="btn-press tap-target rounded-lg px-3 py-2 text-sm font-medium transition {page.url.pathname === t.href ? 'bg-[var(--color-surface)] text-[var(--color-accent)] font-semibold' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}">
						{t.label}
					</a>
				{/each}
			</nav>
			<div class="flex items-center gap-3">
				<span class="hidden text-sm text-[var(--color-fg-muted)] sm:inline">Hi, {data.user.fullname.split(' ')[0]}</span>
				<button onclick={logout} class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">Log out</button>
			</div>
		</div>
	</header>

	{#if data.rider && !data.rider.isVerified}
		<div class="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-center text-xs text-amber-700">
			Your account is pending admin verification. You can browse the dashboard but can't accept rides yet.
		</div>
	{/if}

	<main class="mx-auto max-w-5xl px-5 py-8">{@render children()}</main>
</div>
<ToastHost />
