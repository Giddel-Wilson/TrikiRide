<script lang="ts">
	import AuthHero from '$lib/components/auth/AuthHero.svelte';
	import StepItem from '$lib/components/auth/StepItem.svelte';
	import InputGroup from '$lib/components/auth/InputGroup.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { genUploader } from 'uploadthing/client';
	import type { OurFileRouter } from '$lib/server/uploadthing';
	import { onDestroy } from 'svelte';
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
	let matricNo = $state('');
	let phone = $state('');
	let password = $state('');
	let vehicleIdentifierType = $state<'plate' | 'serial' | 'na'>('na');
	let vehicleIdentifier = $state('');
	let tricycleModel = $state('');
	let tricycleColour = $state('');
	let profilePhotoUrl = $state('');
	let profilePhotoFile = $state<File | null>(null);
	let profilePhotoPreview = $state('');
	const { uploadFiles: uploadRegistrationFiles } = genUploader<OurFileRouter>();
	onDestroy(() => { if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview); });

	function selectProfilePhoto(event: Event) {
		if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
		profilePhotoFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		profilePhotoPreview = profilePhotoFile ? URL.createObjectURL(profilePhotoFile) : '';
		profilePhotoUrl = '';
	}

	const stepLabels = $derived(
		role === 'rider'
			? ['Register your identity', 'Add your tricycle details', 'Set a secure password']
			: ['Register your identity', 'Set a secure password']
	);
	const totalSteps = $derived(stepLabels.length);

	function switchRole(next: 'passenger' | 'rider') {
		role = next; currentStep = 1; stepError = '';
		if (next === 'rider') { vehicleIdentifierType = 'na'; vehicleIdentifier = ''; }
	}
	function goNext() {
		if (currentStep === 1 && (!fullname || !phone || !email)) {
			stepError = 'Fill in your name, phone, and email to continue.'; return;
		}
		if (currentStep === 1 && role === 'passenger' && !matricNo) {
			stepError = 'Your matric number is required to verify you as a UNIPORT student.'; return;
		}
		if (currentStep === 1 && phone.replace(/\D/g, '').length < 7) {
			stepError = 'Phone number must be at least 7 digits.'; return;
		}
		if (currentStep === 2 && role === 'rider' && vehicleIdentifierType !== 'na' && !vehicleIdentifier.trim()) {
			stepError = 'Enter the selected vehicle number or choose N/A.'; return;
		}
		stepError = ''; currentStep += 1;
	}
	function goBack() { stepError = ''; currentStep -= 1; }

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (password.length < 6) { stepError = 'Password must be at least 6 characters.'; return; }
		errorMsg = ''; loading = true;
		try {
			if (role === 'rider' && profilePhotoFile && !profilePhotoUrl) {
				if (profilePhotoFile.size > 4 * 1024 * 1024) throw new Error('Choose a profile photo smaller than 4 MB.');
				const uploaded = await uploadRegistrationFiles('riderProfilePhoto', { files: [profilePhotoFile] });
				profilePhotoUrl = uploaded[0].ufsUrl;
			}
			const endpoint = role === 'passenger' ? '/api/auth/register/passenger' : '/api/auth/register/rider';
			const payload = role === 'passenger'
				? { fullname, email, matricNo, phone, password }
				: { fullname, email, phone, password, vehicleIdentifierType, vehicleIdentifier, tricycleModel, tricycleColour, profilePhotoUrl };
			const res = await fetch(endpoint, {
				method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (!res.ok) { errorMsg = data.error ?? 'Something went wrong.'; return; }
			await goto(role === 'passenger' ? '/passenger' : '/rider');
		} catch (cause) {
			errorMsg = cause instanceof Error ? cause.message : 'Could not upload your profile photo. Please try again.';
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
			<a href="/" class="mb-2 flex justify-start lg:hidden"><Logo /></a>

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
							{#if role === 'passenger'}
								<InputGroup id="matricNo" label="Matric number" placeholder="U2022/5570155" bind:value={matricNo}
									helper="Used to verify you're a registered UNIPORT student." required />
							{/if}
						{:else if currentStep === 2 && role === 'rider'}
							<div class="grid grid-cols-2 gap-4">
								<div class="col-span-2">
									<label for="vehicleIdentifierType" class="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">Vehicle number type</label>
									<div class="flex gap-3">
										<div class="relative w-40 shrink-0">
											<select id="vehicleIdentifierType" bind:value={vehicleIdentifierType} onchange={() => vehicleIdentifier = ''} class="h-11 w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2 pl-4 pr-10 text-sm text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20">
												<option value="na">N/A</option>
												<option value="plate">Plate number</option>
												<option value="serial">Serial number</option>
											</select>
											<svg aria-hidden="true" class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
										</div>
										<input id="vehicleIdentifier" type="text" bind:value={vehicleIdentifier} disabled={vehicleIdentifierType === 'na'} required={vehicleIdentifierType !== 'na'} placeholder={vehicleIdentifierType === 'plate' ? 'e.g. PHC-234-KK' : vehicleIdentifierType === 'serial' ? 'e.g. TRK-00231' : 'No number provided'} class="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)]/50 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:opacity-60" />
									</div>
									<p class="mt-1.5 text-xs text-[var(--color-fg-muted)]">If you choose N/A, add your plate or serial number during driver verification before an admin can approve you.</p>
								</div>
								<InputGroup id="model" label="Model" placeholder="TVS King" bind:value={tricycleModel} />
								<InputGroup id="colour" label="Colour" placeholder="Yellow" bind:value={tricycleColour} />
							</div>
							<div>
								<label for="profilePhoto" class="mb-1.5 block text-sm font-medium text-[var(--color-fg)]">Profile photo</label>
								<div class="flex items-center gap-3">
									<input id="profilePhoto" type="file" accept="image/*" onchange={selectProfilePhoto} class="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-sm text-[var(--color-fg)] file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium" />
									{#if profilePhotoFile}
										<img src={profilePhotoPreview} alt="Selected profile preview" class="h-12 w-12 rounded-full border border-[var(--color-border)] object-cover" />
									{/if}
								</div>
								<p class="mt-1.5 text-xs text-[var(--color-fg-muted)]">Optional. Upload a photo from your device (max 4 MB); it will be shown to passengers after matching.</p>
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
