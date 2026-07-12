<script lang="ts">
	let { size = 28, dark = false }: { size?: number; dark?: boolean } = $props();
</script>

<div class="flex items-center gap-2.5">
	<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect width="32" height="32" rx="9" fill="var(--color-accent)" />
		<path d="M9 21L15 11" stroke="white" stroke-width="2.4" stroke-linecap="round" />
		<path d="M14 21L20 11" stroke="white" stroke-width="2.4" stroke-linecap="round" opacity="0.7" />
		<path d="M19 21L25 11" stroke="white" stroke-width="2.4" stroke-linecap="round" opacity="0.4" />
	</svg>
	<span class="font-heading text-lg font-semibold tracking-tight {dark ? 'text-white' : 'text-[var(--color-fg)]'}">
		Trik<span class="text-[var(--color-accent)]">Ride</span>
	</span>
</div>
