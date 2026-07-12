<script lang="ts">
	import { pushToast } from '$lib/components/toast.svelte';

	let { label, kind }: { label: string; kind: 'google' | 'github' } = $props();

	function handleClick() {
		pushToast(`${label} sign-in is coming soon — use email for now.`, 'info');
	}
</script>

<button
	type="button"
	onclick={handleClick}
	class="btn-press tap-target flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm font-medium text-white hover:bg-white/5"
>
	{#if kind === 'google'}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
			<path d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.44Z" fill="#4285F4"/>
			<path d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.4.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z" fill="#34A853"/>
			<path d="M6.4 13.91A6.01 6.01 0 0 1 6.08 12c0-.66.11-1.3.32-1.91V7.5H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.5l3.35-2.59Z" fill="#FBBC05"/>
			<path d="M12 5.98c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.96 9.96 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.35 2.59C7.2 7.74 9.4 5.98 12 5.98Z" fill="#EA4335"/>
		</svg>
	{:else}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.24-.01-1.04-.01-1.88-2.78.61-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.04 1.53 1.04.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.13-4.56-5.02 0-1.11.39-2.02 1.03-2.73-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.04a9.4 9.4 0 0 1 5 0c1.91-1.31 2.75-1.04 2.75-1.04.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.73 0 3.9-2.34 4.76-4.57 5.01.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/>
		</svg>
	{/if}
	{label}
</button>
