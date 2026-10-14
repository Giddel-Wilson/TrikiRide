<script lang="ts">
	import { genUploader } from 'uploadthing/client';
	import type { OurFileRouter } from '$lib/server/uploadthing';
	import type { FaceLandmarker as FaceLandmarkerType } from '@mediapipe/tasks-vision';
	import { pushToast } from '$lib/components/toast.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onDestroy, tick } from 'svelte';

	let { verification, vehicleIdentifier }: { verification: { status: 'pending' | 'approved' | 'declined'; reviewNotes: string | null } | null | undefined; vehicleIdentifier: string | null } = $props();
	type ActionId = 'mouth' | 'left' | 'right' | 'nod' | 'blink';
	type Challenge = { id: ActionId; text: string; spoken: string };
	const actionPool: Challenge[] = [
		{ id: 'mouth', text: 'Open your mouth', spoken: 'Please open your mouth.' },
		{ id: 'left', text: 'Turn your head left', spoken: 'Please turn your head to your left.' },
		{ id: 'right', text: 'Turn your head right', spoken: 'Please turn your head to your right.' },
		{ id: 'nod', text: 'Nod your head', spoken: 'Please nod your head.' },
		{ id: 'blink', text: 'Blink your eyes', spoken: 'Please blink your eyes.' }
	];
	const { uploadFiles: uploadKycFiles } = genUploader<OurFileRouter>();

	let documentType = $state<'nin' | 'drivers_license'>('nin');
	let vehicleIdentifierType = $state<'plate' | 'serial'>('plate');
	let vehicleIdentifierInput = $state('');
	let documentFile = $state<File | null>(null);
	let modalOpen = $state(false);
	let busy = $state(false);
	let uploadingEvidence = $state(false);
	let scanReady = $state(false);
	let complete = $state(false);
	let settling = $state(false);
	let captureCountdown = $state(0);
	let submissionFailed = $state(false);
	let statusText = $state('Starting your camera…');
	let challenges = $state<Challenge[]>([]);
	let challengeIndex = $state(0);
	let videoEl = $state<HTMLVideoElement>();
	let canvasEl = $state<HTMLCanvasElement>();
	let stream: MediaStream | null = null;
	let landmarker: FaceLandmarkerType | null = null;
	let FaceLandmarkerClass: typeof import('@mediapipe/tasks-vision').FaceLandmarker | null = null;
	let frameHandle = 0;
	let lastVideoTime = -1;
	let faceStableFrames = 0;
	let locked = $state(false);
	let baselineYaw: number | null = null;
	let baselinePitch: number | null = null;
	let actionFrames = 0;
	let advancing = false;
	let faceCapture: File | null = null;

	function speak(text: string) {
		if (!('speechSynthesis' in window)) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'en-NG';
		utterance.rate = 0.92;
		window.speechSynthesis.speak(utterance);
	}

	function pickChallenges(): Challenge[] {
		const shuffled = [...actionPool];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled.slice(0, 3);
	}

	async function beginReview() {
		if (!documentFile) { pushToast('Choose your NIN or driver’s licence first.', 'error'); return; }
		if (!vehicleIdentifier && !vehicleIdentifierInput.trim()) { pushToast('Enter your plate or serial number to continue verification.', 'error'); return; }
		busy = true;
		challenges = pickChallenges();
		challengeIndex = 0;
		complete = false;
		settling = false;
		captureCountdown = 0;
		submissionFailed = false;
		uploadingEvidence = false;
		faceCapture = null;
		scanReady = false;
		locked = false;
		faceStableFrames = 0;
		baselineYaw = null;
		baselinePitch = null;
		statusText = 'Starting your camera…';
		modalOpen = true;
		await tick();
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
			if (!videoEl) throw new Error('Camera preview is unavailable.');
			videoEl.srcObject = stream;
			await videoEl.play();
			statusText = 'Loading face scan…';
			const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
			FaceLandmarkerClass = FaceLandmarker;
			const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
			const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
			const options = {
				runningMode: 'VIDEO',
				numFaces: 2,
				outputFaceBlendshapes: true,
				outputFacialTransformationMatrixes: true
			} as const;
			try {
				landmarker = await FaceLandmarker.createFromOptions(fileset, { ...options, baseOptions: { modelAssetPath, delegate: 'GPU' } });
			} catch {
				landmarker = await FaceLandmarker.createFromOptions(fileset, { ...options, baseOptions: { modelAssetPath, delegate: 'CPU' } });
			}
			scanReady = true;
			statusText = 'Position your face inside the guide';
			frameHandle = requestAnimationFrame(scanFrame);
		} catch (cause) {
			statusText = cause instanceof Error && cause.name === 'NotAllowedError'
				? 'Camera permission is needed to continue.'
				: 'Could not start the face scan. Check camera access and try again.';
			console.error('[kyc] Face scan could not start', cause);
			stopCamera();
			busy = false;
			scanReady = false;
		}
	}

	function blendshapeScore(result: { faceBlendshapes: Array<{ categories: Array<{ categoryName: string; score: number }> }> }, name: string) {
		return result.faceBlendshapes[0]?.categories.find((category) => category.categoryName === name)?.score ?? 0;
	}

	function drawFace(landmarks: Array<{ x: number; y: number }>) {
		const canvas = canvasEl;
		if (!canvas || !videoEl || !FaceLandmarkerClass || !videoEl.videoWidth) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
			canvas.width = videoEl.videoWidth;
			canvas.height = videoEl.videoHeight;
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// The video and canvas layers are both mirrored in CSS for the selfie preview.
		// Keep model coordinates unflipped here so the overlay receives the same single
		// CSS mirror as the video instead of being mirrored twice.
		const x = (index: number) => landmarks[index].x * canvas.width;
		const y = (index: number) => landmarks[index].y * canvas.height;
		ctx.lineWidth = 0.65;
		ctx.strokeStyle = locked ? 'rgba(74, 222, 128, .43)' : 'rgba(45, 212, 191, .35)';
		ctx.beginPath();
		for (const edge of FaceLandmarkerClass.FACE_LANDMARKS_TESSELATION) {
			ctx.moveTo(x(edge.start), y(edge.start));
			ctx.lineTo(x(edge.end), y(edge.end));
		}
		ctx.stroke();
		ctx.beginPath();
		for (const edge of FaceLandmarkerClass.FACE_LANDMARKS_FACE_OVAL) {
			ctx.moveTo(x(edge.start), y(edge.start));
			ctx.lineTo(x(edge.end), y(edge.end));
		}
		ctx.closePath();
		ctx.lineWidth = 2.5;
		ctx.strokeStyle = locked ? '#4ade80' : '#2dd4bf';
		ctx.shadowColor = ctx.strokeStyle;
		ctx.shadowBlur = 12;
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	function currentActionPassed(action: Challenge, result: ReturnType<NonNullable<typeof landmarker>['detectForVideo']>) {
		const matrix = result.facialTransformationMatrixes[0]?.data;
		const yaw = matrix ? Math.atan2(matrix[8], matrix[10]) : 0;
		const pitch = matrix ? Math.atan2(-matrix[9], matrix[5]) : 0;
		if (baselineYaw === null) baselineYaw = yaw;
		if (baselinePitch === null) baselinePitch = pitch;
		if (action.id === 'mouth') return blendshapeScore(result, 'jawOpen') > 0.32;
		if (action.id === 'blink') return blendshapeScore(result, 'eyeBlinkLeft') > 0.55 && blendshapeScore(result, 'eyeBlinkRight') > 0.55;
		if (action.id === 'left') return yaw - baselineYaw > 0.18;
		if (action.id === 'right') return baselineYaw - yaw > 0.18;
		return Math.abs(pitch - baselinePitch) > 0.14;
	}

	function scanFrame() {
		if (!landmarker || !videoEl || videoEl.readyState < 2) {
			frameHandle = requestAnimationFrame(scanFrame);
			return;
		}
		if (videoEl.currentTime !== lastVideoTime) {
			lastVideoTime = videoEl.currentTime;
			try {
				const result = landmarker.detectForVideo(videoEl, performance.now());
				if (result.faceLandmarks.length !== 1) {
					faceStableFrames = 0;
					locked = false;
					statusText = result.faceLandmarks.length > 1 ? 'Only one person should be in view' : 'Position your face inside the guide';
					canvasEl?.getContext('2d')?.clearRect(0, 0, canvasEl.width, canvasEl.height);
				} else {
					drawFace(result.faceLandmarks[0]);
					faceStableFrames++;
					if (!locked && faceStableFrames >= 10) {
						locked = true;
						const matrix = result.facialTransformationMatrixes[0]?.data;
						if (matrix) {
							baselineYaw = Math.atan2(matrix[8], matrix[10]);
							baselinePitch = Math.atan2(-matrix[9], matrix[5]);
						}
						statusText = 'Face locked. Follow the spoken instructions';
						speak(challenges[challengeIndex].spoken);
					}
					if (locked && !complete && !advancing) {
						const action = challenges[challengeIndex];
						if (action && currentActionPassed(action, result)) actionFrames++;
						else actionFrames = 0;
						if (actionFrames >= 5) void passChallenge();
					}
				}
			} catch (cause) {
				console.error('[kyc] Face landmark detection failed', cause);
			}
		}
		frameHandle = requestAnimationFrame(scanFrame);
	}

	async function passChallenge() {
		if (advancing) return;
		advancing = true;
		actionFrames = 0;
		if (challengeIndex + 1 < challenges.length) {
			challengeIndex++;
			statusText = 'Good. Now follow the next instruction';
			await new Promise((resolve) => setTimeout(resolve, 750));
			speak(challenges[challengeIndex].spoken);
			advancing = false;
			return;
		}
		complete = true;
		scanReady = false;
		try {
			settling = true;
			speak('Liveness check complete. Relax your face, close your mouth, and look straight at the camera.');
			for (let seconds = 10; seconds > 0; seconds--) {
				captureCountdown = seconds;
				statusText = `Relax your face and look at the camera. Capturing in ${seconds}…`;
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			captureCountdown = 0;
			settling = false;
			faceCapture = await captureFace();
			await submitEvidence();
		} catch (cause) {
			settling = false;
			complete = false;
			statusText = cause instanceof Error ? cause.message : 'Could not submit the request.';
			pushToast(statusText, 'error');
			busy = false;
			advancing = false;
			scanReady = false;
			stopCamera();
		}
	}

	async function uploadFileWithRetry(endpoint: 'kycDocument' | 'kycFaceScan', file: File): Promise<string> {
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				const result = endpoint === 'kycDocument'
					? await uploadKycFiles('kycDocument', { files: [file] })
					: await uploadKycFiles('kycFaceScan', { files: [file] });
				return result[0].ufsUrl;
			} catch (cause) {
				if (attempt === 2) {
					console.error(`[kyc] UploadThing ${endpoint} upload failed after retries`, cause);
					throw new Error('UploadThing could not be reached. Check your internet or DNS connection, then retry.');
				}
				statusText = `Connection issue. Retrying upload (${attempt + 2}/3)…`;
				await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
			}
		}
		throw new Error('Upload failed. Please retry.');
	}

	async function submitEvidence() {
		if (!documentFile || !faceCapture) return;
		busy = true;
		uploadingEvidence = true;
		submissionFailed = false;
		complete = true;
		statusText = 'Face scan complete. Uploading your request…';
		try {
			const documentUrl = await uploadFileWithRetry('kycDocument', documentFile);
			const faceScanUrl = await uploadFileWithRetry('kycFaceScan', faceCapture);
			const response = await fetch('/api/rider/verification', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ documentType, documentUrl, faceScanUrl, vehicleIdentifierType: vehicleIdentifier ? undefined : vehicleIdentifierType, vehicleIdentifier: vehicleIdentifier ? undefined : vehicleIdentifierInput.trim() })
			});
			if (!response.ok) throw new Error((await response.json()).message ?? 'Could not submit verification request.');
			statusText = 'Request submitted. An admin will review your documents.';
			pushToast('Verification request submitted for admin review.', 'success');
			await invalidateAll();
		} catch (cause) {
			submissionFailed = true;
			statusText = cause instanceof Error ? cause.message : 'Could not submit the request.';
			pushToast(statusText, 'error');
		} finally {
			busy = false;
			uploadingEvidence = false;
			advancing = false;
			scanReady = false;
			stopCamera();
		}
	}

	function captureFace(): Promise<File> {
		return new Promise((resolve, reject) => {
			if (!videoEl) { reject(new Error('Camera preview is unavailable.')); return; }
			const canvas = document.createElement('canvas');
			canvas.width = videoEl.videoWidth;
			canvas.height = videoEl.videoHeight;
			const ctx = canvas.getContext('2d');
			if (!ctx || !canvas.width) { reject(new Error('Could not capture the face scan.')); return; }
			ctx.translate(canvas.width, 0);
			ctx.scale(-1, 1);
			ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((blob) => blob ? resolve(new File([blob], 'face-scan.jpg', { type: 'image/jpeg' })) : reject(new Error('Could not capture the face scan.')), 'image/jpeg', 0.88);
		});
	}

	function stopCamera() {
		if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frameHandle);
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
		if (videoEl) videoEl.srcObject = null;
		landmarker?.close();
		landmarker = null;
		FaceLandmarkerClass = null;
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
	}

	function closeModal() {
		stopCamera();
		modalOpen = false;
		busy = false;
	}

	onDestroy(stopCamera);
</script>

<section class="mx-auto mb-5 max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
	<h2 class="font-heading text-base font-semibold">Complete driver verification</h2>
	<p class="mt-1 text-sm">Upload your NIN or driver’s licence. We’ll guide you through a short camera face scan before sending your request to an admin.</p>
	{#if verification?.status === 'declined' && verification.reviewNotes}
		<p class="mt-2 text-sm font-medium">Admin feedback: {verification.reviewNotes}</p>
	{/if}
	<div class="mt-4 max-w-xl">
		{#if !vehicleIdentifier}
			<div class="mb-3">
				<label for="kycVehicleIdentifierType" class="block text-sm font-medium">Vehicle number for verification</label>
				<div class="mt-1 flex gap-2">
					<select id="kycVehicleIdentifierType" bind:value={vehicleIdentifierType} class="h-11 w-40 shrink-0 rounded-lg border border-amber-300 bg-white px-3 text-sm">
						<option value="plate">Plate number</option><option value="serial">Serial number</option>
					</select>
					<input id="kycVehicleIdentifier" bind:value={vehicleIdentifierInput} required aria-label={vehicleIdentifierType === 'plate' ? 'Plate number' : 'Serial number'} placeholder={vehicleIdentifierType === 'plate' ? 'e.g. PHC-234-KK' : 'e.g. TRK-00231'} class="h-11 min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 text-sm" />
				</div>
				<p class="mt-1 text-xs">You chose N/A at signup. Provide one vehicle number before this verification request can be approved.</p>
			</div>
		{/if}
		<label class="text-sm font-medium">Identification type
			<select bind:value={documentType} class="mt-1 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2">
				<option value="nin">NIN</option><option value="drivers_license">Driver’s licence</option>
			</select>
		</label>
		<label class="mt-3 block text-sm font-medium">ID document (image or PDF)
			<input type="file" accept="image/*,application/pdf" onchange={(e) => documentFile = e.currentTarget.files?.[0] ?? null} class="mt-1 block w-full text-sm" />
		</label>
	</div>
	<button onclick={beginReview} disabled={busy} class="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Face scan in progress…' : verification?.status === 'declined' ? 'Resubmit verification' : 'Submit for review'}</button>
</section>

{#if modalOpen}
	<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onclick={(event) => { if (event.target === event.currentTarget && !busy) closeModal(); }} onkeydown={(event) => { if (event.key === 'Escape' && !busy) closeModal(); }}>
		<div role="dialog" aria-modal="true" aria-labelledby="face-scan-title" class="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
			<header class="flex items-start justify-between px-5 pt-5">
				<div><p class="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">Identity check</p><h2 id="face-scan-title" class="font-heading mt-1 text-xl font-semibold">Live face scan</h2></div>
				<button onclick={closeModal} disabled={uploadingEvidence} aria-label="Close face scan" class="rounded-full px-3 py-1 text-xl text-slate-500 disabled:opacity-40">×</button>
			</header>
			<div class="px-5 pt-4">
				<div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950">
					<video bind:this={videoEl} playsinline muted class="absolute inset-0 h-full w-full -scale-x-100 object-cover"></video>
					<canvas bind:this={canvasEl} class="absolute inset-0 h-full w-full -scale-x-100 object-cover"></canvas>
					{#if !locked && !complete}
						<div class="pointer-events-none absolute inset-[10%] rounded-[48%] border-2 border-dashed border-white/70"></div>
					{/if}
					{#if !scanReady && !complete}
						<div class="absolute inset-0 flex items-center justify-center bg-slate-950/75 px-8 text-center text-sm text-white">{statusText}</div>
					{/if}
					{#if complete && !settling}
						<div class="absolute inset-0 flex items-center justify-center bg-slate-950/55 px-8 text-center text-sm font-medium text-white">{statusText}</div>
					{/if}
					{#if complete && settling}
						<div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/55 text-center text-white">
							<p class="text-sm font-semibold">Relax your face and look straight ahead</p>
							<span class="mt-2 rounded-full border-4 border-white/80 px-6 py-2 text-6xl font-bold tabular-nums drop-shadow-lg" aria-hidden="true">{captureCountdown}</span>
							<span class="sr-only" aria-live="assertive">Capturing in {captureCountdown} seconds</span>
						</div>
					{/if}
				</div>
				{#if settling}
					<div class="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-center font-semibold text-white" aria-live="polite">
						<span>Capturing face in</span>
						<span class="text-2xl tabular-nums">{captureCountdown}</span>
						<span>{captureCountdown === 1 ? 'second' : 'seconds'}</span>
					</div>
				{/if}
				<p aria-live="polite" class="mt-4 min-h-6 text-center text-sm font-semibold text-slate-800">{statusText}</p>
				{#if scanReady && !complete}
					<div class="mb-5 mt-3 grid grid-cols-3 gap-2">
						{#each challenges as challenge, index (challenge.id)}
							<div class="rounded-xl px-2 py-2 text-center text-xs {index < challengeIndex ? 'bg-green-100 text-green-800' : index === challengeIndex && locked ? 'bg-[var(--color-accent)] text-white' : 'bg-slate-100 text-slate-500'}">{index < challengeIndex ? '✓ ' : `${index + 1}. `}{challenge.text}</div>
						{/each}
					</div>
				{/if}
				{#if submissionFailed}
					<button onclick={submitEvidence} disabled={busy} class="mb-2 w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Retrying upload…' : 'Retry submission'}</button>
				{/if}
				{#if !uploadingEvidence}
					<button onclick={closeModal} class="mb-5 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">{complete && !submissionFailed ? 'Done' : 'Cancel face scan'}</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
