<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	const steps = [
		{ title: 'Set pickup & destination', text: 'Pick from campus locations like Abuja Park or Faculty of Science — fare is calculated instantly.' },
		{ title: 'Get matched with a rider', text: "See your rider's name, plate number, and rating before you confirm." },
		{ title: 'Track, ride, pay, rate', text: 'Follow your rider to the pickup point, pay by cash or transfer, then rate your trip.' }
	];

	const problems = [
		'No formal booking platform — passengers must physically search for riders',
		'Inconsistent, unfair fare negotiation on every trip',
		'Zero real-time tracking once a passenger boards',
		'Cash-only transactions with no dispute trail',
		'No rating system to identify trustworthy drivers'
	];
</script>

<svelte:head><title>TrikRide UNIPORT — Online Tricycle Ride Booking</title></svelte:head>

<div class="min-h-screen bg-[var(--color-bg)]">
	<!-- Nav -->
	<header class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
			<Logo />
			<nav class="hidden items-center gap-8 text-sm text-[var(--color-fg-muted)] md:flex">
				<a href="#how-it-works" class="transition hover:text-[var(--color-fg)]">How it works</a>
				<a href="#problems" class="transition hover:text-[var(--color-fg)]">Why TrikRide</a>
				<a href="#fares" class="transition hover:text-[var(--color-fg)]">Fares</a>
			</nav>
			<div class="flex items-center gap-3">
				<a href="/login" class="btn-press flex items-center tap-target rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">Log in</a>
				<a href="/register" class="btn-press flex items-center tap-target rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">Get started</a>
			</div>
		</div>
	</header>

	<!-- Hero -->
	<section class="mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24">
		<div class="grid items-center gap-12 md:grid-cols-2">
			<div class="enter-fade">
				<span class="mb-5 inline-block rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-fg-muted)]">
					Built for the University of Port Harcourt
				</span>
				<h1 class="font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-[var(--color-fg)] md:text-5xl">
					Book a Keke in seconds, not minutes.
				</h1>
				<p class="mt-5 max-w-md text-base leading-relaxed text-[var(--color-fg-muted)]">
					TrikRide replaces roadside negotiation with transparent fares, verified riders, and live trip tracking — built for campus life.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<a href="/register?role=passenger" class="btn-press tap-target rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">Book your first ride</a>
					<a href="/register?role=rider" class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface)]">Become a rider</a>
				</div>
				<div class="mt-10 flex items-center gap-8 text-sm">
					<div>
						<p class="font-heading text-2xl font-semibold text-[var(--color-accent)]">₦200</p>
						<p class="text-[var(--color-fg-muted)]">base fare</p>
					</div>
					<div class="h-8 w-px bg-[var(--color-border)]"></div>
					<div>
						<p class="font-heading text-2xl font-semibold text-[var(--color-fg)]">3</p>
						<p class="text-[var(--color-fg-muted)]">user roles</p>
					</div>
					<div class="h-8 w-px bg-[var(--color-border)]"></div>
					<div>
						<p class="font-heading text-2xl font-semibold text-[var(--color-fg)]">24/7</p>
						<p class="text-[var(--color-fg-muted)]">availability</p>
					</div>
				</div>
			</div>

			<!-- Booking card mockup -->
			<div class="enter-fade card-surface relative rounded-2xl p-6 shadow-lg" style="animation-delay: 80ms">
				<div class="mb-5 flex items-center justify-between">
					<p class="font-heading text-sm font-semibold text-[var(--color-fg)]">Book a ride</p>
					<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">12 riders online</span>
				</div>
				<div class="space-y-3">
					<div class="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
						<span class="h-2 w-2 rounded-full bg-green-500"></span>
						<div>
							<p class="text-xs text-[var(--color-fg-muted)]">Pickup</p>
							<p class="text-sm text-[var(--color-fg)]">Abuja Park</p>
						</div>
					</div>
					<div class="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
						<span class="h-2 w-2 rounded-full bg-[var(--color-accent)]"></span>
						<div>
							<p class="text-xs text-[var(--color-fg-muted)]">Destination</p>
							<p class="text-sm text-[var(--color-fg)]">Faculty of Science</p>
						</div>
					</div>
				</div>
				<div class="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
					<span class="text-sm text-[var(--color-fg-muted)]">Estimated fare</span>
					<span class="font-heading text-lg font-semibold text-[var(--color-accent)]">₦440</span>
				</div>
				<button class="btn-press tap-target mt-4 w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">
					Confirm booking
				</button>
			</div>
		</div>
	</section>

	<!-- Problems -->
	<section id="problems" class="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-20">
		<div class="mx-auto max-w-6xl px-5">
			<h2 class="font-heading text-2xl font-semibold text-[var(--color-fg)] md:text-3xl">The old way of catching a Keke is broken.</h2>
			<p class="mt-3 max-w-xl text-[var(--color-fg-muted)]">The same recurring pain points across campus, every day.</p>
			<div class="mt-10 grid gap-3 md:grid-cols-2">
				{#each problems as p, i (p)}
					<div class="stagger-item card-surface flex items-start gap-3 rounded-xl p-4 shadow-sm" style="animation-delay: {i * 60}ms">
						<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
							<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
						</span>
						<p class="text-sm text-[var(--color-fg-muted)]">{p}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section id="how-it-works" class="py-20">
		<div class="mx-auto max-w-6xl px-5">
			<h2 class="font-heading text-2xl font-semibold text-[var(--color-fg)] md:text-3xl">How TrikRide works</h2>
			<div class="mt-10 grid gap-6 md:grid-cols-3">
				{#each steps as s, i (s.title)}
					<div class="stagger-item card-tinted rounded-2xl p-6 shadow-sm" style="animation-delay: {i * 80}ms">
						<span class="font-heading text-3xl font-semibold text-[var(--color-accent)]">{i + 1}</span>
						<h3 class="mt-4 font-heading text-base font-semibold text-[var(--color-fg)]">{s.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{s.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Fares -->
	<section id="fares" class="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-20">
		<div class="mx-auto max-w-6xl px-5 text-center">
			<h2 class="font-heading text-2xl font-semibold text-[var(--color-fg)] md:text-3xl">Transparent, fixed-rate fares</h2>
			<p class="mx-auto mt-3 max-w-md text-[var(--color-fg-muted)]">₦200 base fare + ₦80 per kilometre. No haggling, no surprises — set centrally by the administrator.</p>
			<div class="mt-10 flex flex-wrap items-center justify-center gap-8">
				<a href="/register?role=passenger" class="btn-press tap-target rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]">Create a passenger account</a>
				<a href="/register?role=rider" class="btn-press tap-target rounded-lg border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface-muted)]">Register as a rider</a>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-[var(--color-border)] bg-[var(--color-fg)] pt-16">
		<div class="mx-auto max-w-6xl px-5">
			<p class="select-none font-heading text-[19vw] leading-[0.8] font-bold tracking-tight text-white sm:text-[16vw] lg:text-[150px]">
				TRIKRIDE
			</p>
			<div class="mt-10 grid grid-cols-2 gap-y-10 border-t border-white/10 pt-10 sm:grid-cols-4">
				<div>
					<h3 class="text-xs font-semibold tracking-widest text-white uppercase">Navigate</h3>
					<ul class="mt-4 space-y-2.5 text-sm text-white/50">
						<li><a href="#how-it-works" class="transition hover:text-white">How it works</a></li>
						<li><a href="#problems" class="transition hover:text-white">Why TrikRide</a></li>
						<li><a href="#fares" class="transition hover:text-white">Fares</a></li>
						<li><a href="/register" class="transition hover:text-white">Sign up</a></li>
					</ul>
				</div>
				<div>
					<h3 class="text-xs font-semibold tracking-widest text-white uppercase">Follow</h3>
					<ul class="mt-4 space-y-2.5 text-sm text-white/50">
						<li><a href="https://instagram.com" class="transition hover:text-white">Instagram</a></li>
						<li><a href="https://linkedin.com" class="transition hover:text-white">LinkedIn</a></li>
						<li><a href="https://x.com" class="transition hover:text-white">X</a></li>
					</ul>
				</div>
				<div>
					<h3 class="text-xs font-semibold tracking-widest text-white uppercase">Contact</h3>
					<ul class="mt-4 space-y-2.5 text-sm text-white/50">
						<li><a href="/register" class="transition hover:text-white">Get started</a></li>
						<li><a href="mailto:hello@trikride.app" class="transition hover:text-white">hello@trikride.app</a></li>
						<li><a href="/login?as=admin" class="transition hover:text-white">Admin login</a></li>
					</ul>
				</div>
				<div>
					<h3 class="text-xs font-semibold tracking-widest text-white uppercase">Campus</h3>
					<p class="mt-4 text-sm text-white/50">University of Port Harcourt<br />Choba, Port Harcourt<br />Rivers State, Nigeria</p>
				</div>
			</div>
			<div class="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-[11px] tracking-widest text-white/30 uppercase sm:flex-row">
				<p>All rights reserved.</p>
				<p>Book smart, ride safe.</p>
				<p>© 2026, TrikRide</p>
			</div>
		</div>
	</footer>
</div>
