<script lang="ts">
	let { number, text, active = false }: { number: number; text: string; active?: boolean } = $props();
</script>

<!-- Always rendered inside the dark hero panel — keeps white text -->
<div class="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300 {active
	? 'border-white bg-white text-[var(--color-fg)]'
	: 'border-transparent bg-white/[0.06] text-white'}">
	<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold {active
		? 'bg-[var(--color-accent)] text-white'
		: 'bg-white/10 text-white/40'}">
		{number}
	</span>
	<span class="text-sm font-medium {active ? 'text-[var(--color-fg)]' : 'text-white/70'}">{text}</span>
</div>
