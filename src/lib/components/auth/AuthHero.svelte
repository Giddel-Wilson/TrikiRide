<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import type { Snippet } from 'svelte';
	import keke from '$lib/assets/keke.mp4'

	let {
		heading,
		description,
		children
	}: { heading: string; description: string; children?: Snippet } = $props();
</script>

<!-- Hero panel: always dark — video background -->
<div
	class="relative hidden h-full w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-32 shadow-2xl lg:flex"
	style="background-color: var(--color-hero-bg)"
>
	<!-- Video background — swap src with your own campus/city footage -->
	<video
		class="absolute inset-0 h-full w-full object-cover"
		autoplay
		muted
		loop
		playsinline
	>
		<source
			src={keke}
			type="video/mp4"
		/>
	</video>

	<!-- Dark vignette so text stays legible over any footage -->
	<div
		class="absolute inset-0"
		style="background: linear-gradient(to top, rgba(5,46,22,0.92) 0%, rgba(5,46,22,0.55) 50%, rgba(5,46,22,0.30) 100%)"
	></div>

	<!-- Subtle grid overlay — keeps the map texture without the route line -->
	<svg
		class="absolute inset-0 h-full w-full opacity-20"
		viewBox="0 0 600 600"
		preserveAspectRatio="xMidYMid slice"
		xmlns="http://www.w3.org/2000/svg"
	>
		{#each Array(10) as _, i}
			<line x1={i * 60} y1="0" x2={i * 60} y2="600" stroke="white" stroke-width="0.5" />
		{/each}
		{#each Array(10) as _, i}
			<line x1="0" y1={i * 60} x2="600" y2={i * 60} stroke="white" stroke-width="0.5" />
		{/each}
	</svg>

	<!-- Hero content -->
	<div class="enter-fade relative z-10 w-full max-w-xs space-y-8">
		<div class="stagger-item">
			<Logo size={26} dark />
		</div>
		<div class="stagger-item space-y-2" style="animation-delay: 80ms">
			<h1 class="font-heading text-4xl font-medium tracking-tight whitespace-nowrap text-white">
				{heading}
			</h1>
			<p class="px-0.5 text-sm leading-relaxed text-white/60">{description}</p>
		</div>
		{#if children}
			<div class="stagger-item space-y-2.5" style="animation-delay: 160ms">
				{@render children()}
			</div>
		{/if}
	</div>
</div>
