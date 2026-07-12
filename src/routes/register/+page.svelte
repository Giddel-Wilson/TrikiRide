<script lang="ts">
	import AuthHero from '$lib/components/auth/AuthHero.svelte';
	import StepItem from '$lib/components/auth/StepItem.svelte';
	import InputGroup from '$lib/components/auth/InputGroup.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let role = $state<'passenger' | 'rider'>(
		(page.url.searchParams.get('role') as 'passenger' | 'rider') ?? 'passenger'
	);
	let loading = $state(false);
	let errorMsg = $state('');
	let stepError = $state('');
	let currentStep = $state(1);

	let fullname = $state('');
	let email = $state('');
	let phone = $state('');
	let password = $state('');
	let licenceNumber = $state('');
	let plateNumber = $state('');
	let tricycleModel = $state('');
	let tricycleColour = $state('');

	const stepLabels = $derived(
		role === 'rider'
			? ['Register your identity', 'Add your tricycle details', 'Set a secure password']
			: ['Register your identity', 'Set a secure password']
	);
	const totalSteps = $derived(stepLabels.length);

	function switchRole(next: 'passenger' | 'rider') {
		role = next; currentStep = 1; stepError = '';
	}
	function goNext() {
		if (currentStep === 1 && (!fullname || !phone || !email)) {
			stepError = 'Fill in your name, phone, and email to continue.'; return;
		}
		if (currentStep === 1 && phone.replace(/\D/g, '').length < 7) {
			stepError = 'Phone number must be at least 7 digits.'; return;
		}
		if (currentStep === 2 && role === 'rider' && (!licenceNumber || !plateNumber)) {
			stepError = 'Licence number and plate number are required.'; return;
		}
		stepError = ''; currentStep += 1;
	}
	function goBack() { stepError = ''; currentStep -= 1; }

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (password.length < 6) { stepError = 'Password must be at least 6 characters.'; return; }
		errorMsg = ''; loading = true;
		try {
			const endpoint = role === 'passenger' ? '/api/auth/register/passenger' : '/api/auth/register/rider';
			const payload = role === 'passenger'
				? { fullname, email, phone, password }
				: { fullname, email, phone, password, licenceNumber, plateNumber, tricycleModel, tricycleColour };
			const res = await fetch(endpoint, {
				method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (!res.ok) { errorMsg = data.error ?? 'Something went wrong.'; return; }
			await goto(role === 'passenger' ? '/passenger' : '/rider');
		} finally { loading = false; }
	}
</script>

<svelte:head><title>Create an account — TrikRide</title></svelte:head>

<main class="flex min-h-screen w-full bg-[var(--color-bg)] selection:bg-[var(--color-accent)]/20 p-2 transition-all duration-500 lg:h-screen lg:p-4">
	<AuthHero heading="Join TrikRide" description="Follow these quick steps to activate your campus ride account.">
		{#each stepLabels as label, i (label)}
			<StepItem number={i + 1} text={label} active={currentStep === i + 1} />
		{/each}
	</AuthHero>

	<div class="flex flex-1 flex-col items-center overflow-y-auto bg-[var(--color-bg)] px-4 py-12 sm:px-12 lg:justify-center lg:px-16 lg:py-10 xl:px-24">
		<div class="enter-fade w-full max-w-xl space-y-6">
			<a href="/" class="mb-2 flex justify-center lg:hidden"><Logo /></a>

			<div>
				<h2 class="font-heading text-3xl font-medium tracking-tight text-[var(--color-fg)]">Create New Profile</h2>
				<p class="mt-1 text-sm text-[var(--color-fg-muted)]">Step {currentStep} of {totalSteps} — {stepLabels[currentStep - 1]}.</p>
			</div>

			<!-- Progress bar -->
			<div class="flex gap-1.5">
				{#each stepLabels as _, i (i)}
					<div class="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
						<div class="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500 ease-out"
							style="width: {i + 1 <= currentStep ? '100%' : '0%'}"></div>
					</div>
				{/each}
			</div>

			{#if currentStep === 1}
				<div class="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--color-surface-muted)] p-1">
					{#each [['passenger', 'Passenger'], ['rider', 'Rider']] as [r, label] (r)}
						<button type="button"
							class="btn-press tap-target rounded-lg py-2 text-xs font-semibold transition {role === r
								? 'bg-[var(--color-accent)] text-white'
								: 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'}"
							onclick={() => switchRole(r as typeof role)}>
							{label}
						</button>
					{/each}
				</div>
			{/if}

			<form class="space-y-5" onsubmit={submit}>
				{#key currentStep}
					<div class="enter-fade space-y-5">
						{#if currentStep === 1}
							<div class="grid grid-cols-2 gap-4">
								<InputGroup id="fullname" label="Full name" placeholder="John Samuel" bind:value={fullname} required />
								<InputGroup id="phone" label="Phone number" placeholder="080xxxxxxxx" bind:value={phone} required />
							</div>
							<InputGroup id="email" label="Email address" type="email" placeholder="you@uniport.edu.ng" bind:value={email} required />
						{:else if currentStep === 2 && role === 'rider'}
							<div class="grid grid-cols-2 gap-4">
								<InputGroup id="licence" label="Licence no." placeholder="DL-00231" bind:value={licenceNumber} required />
								<InputGroup id="plate" label="Plate number" placeholder="PHC-234-KK" bind:value={plateNumber} required />
								<InputGroup id="model" label="Model" placeholder="TVS King" bind:value={tricycleModel} />
								<InputGroup id="colour" label="Colour" placeholder="Yellow" bind:value={tricycleColour} />
							</div>
						{:else}
							<InputGroup id="password" label="Password" type="password" placeholder="••••••••"
								bind:value={password} helper="Requires at least 6 characters." required minlength={6} />
						{/if}
					</div>
				{/key}

				{#if stepError}
					<p class="enter-fade rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{stepError}</p>
				{/if}
				{#if errorMsg}
					<p class="enter-fade rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{errorMsg}</p>
				{/if}

				<div class="flex gap-3">
					{#if currentStep > 1}
						<button type="button" onclick={goBack}
							class="btn-press tap-target h-14 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-surface)]">
							Back
						</button>
					{/if}
					{#if currentStep < totalSteps}
						<button type="button" onclick={goNext}
							class="btn-press tap-target h-14 flex-[2] rounded-xl bg-[var(--color-accent)] font-semibold text-white hover:bg-[var(--color-accent-dark)] active:scale-[0.98]">
							Continue
						</button>
					{:else}
						<button type="submit" disabled={loading}
							class="btn-press tap-target h-14 flex-[2] rounded-xl bg-[var(--color-accent)] font-semibold text-white hover:bg-[var(--color-accent-dark)] active:scale-[0.98] disabled:opacity-60">
							{loading ? 'Creating account…' : 'Create Account'}
						</button>
					{/if}
				</div>
			</form>

			<p class="text-center text-sm text-[var(--color-fg-muted)]">
				Member of the team? <a href="/login?as={role}" class="font-semibold text-[var(--color-accent)] hover:underline">Log in</a>
			</p>
		</div>
	</div>
</main>