<script lang="ts">
	import { getToasts } from './toast.svelte';

	const kindStyles: Record<string, string> = {
		success: 'border-green-500/40 bg-green-50 text-green-800',
		error:   'border-red-500/40 bg-red-50 text-red-700',
		info:    'border-green-500/30 bg-green-50 text-green-700'
	};
</script>

<div class="pointer-events-none fixed bottom-4 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
	{#each getToasts() as t (t.id)}
		<div class="enter-fade pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg {kindStyles[t.kind]}">
			{t.message}
		</div>
	{/each}
</div>
