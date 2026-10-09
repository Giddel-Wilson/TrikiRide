<script lang="ts">
	let {
		id, label, type = 'text', placeholder = '',
		value = $bindable(''), helper = '',
		required = false, minlength
	}: {
		id: string; label: string; type?: string; placeholder?: string;
		value?: string; helper?: string; required?: boolean; minlength?: number;
	} = $props();

	let reveal = $state(false);
	const isPassword = $derived(type === 'password');
</script>

<div>
	<label for={id} class="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">{label}</label>
	<div class="relative">
		<input
			{id}
			type={isPassword && reveal ? 'text' : type}
			{placeholder}
			{required}
			{minlength}
			bind:value
			class="tap-target h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)]/50 outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 {isPassword ? 'pr-11' : ''}"
		/>
		{#if isPassword}
			<button
				type="button"
				onclick={() => (reveal = !reveal)}
				class="absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
				aria-label={reveal ? 'Hide password' : 'Show password'}
			>
				{#if reveal}
					<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/></svg>
				{:else}
					<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
				{/if}
			</button>
		{/if}
	</div>
	{#if helper}
		<p class="mt-1.5 text-xs text-[var(--color-fg-muted)]">{helper}</p>
	{/if}
</div>
