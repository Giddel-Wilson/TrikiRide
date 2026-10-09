<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export interface MapMarker {
		id: string;
		lat: number;
		lng: number;
		type: 'pickup' | 'destination' | 'rider' | 'self';
		label?: string;
		pulse?: boolean;
	}

	let {
		height = '100%',
		center = [4.9005, 6.9145] as [number, number],
		zoom = 15,
		markers = [] as MapMarker[],
		autoFit = false,
		class: className = ''
	}: {
		height?: string;
		center?: [number, number];
		zoom?: number;
		markers?: MapMarker[];
		autoFit?: boolean;
		class?: string;
	} = $props();

	let mapEl: HTMLDivElement;
	let L: any = null;
	let map: any = null;
	let markerRefs = new Map<string, any>();
	let routeLine: any = null;
	let ready = $state(false);

	const iconDefs = {
		pickup:      { bg: '#16a34a', fg: '#fff', glyph: 'P',  size: 36 },
		destination: { bg: '#1d4ed8', fg: '#fff', glyph: 'D',  size: 36 },
		rider:       { bg: '#15803d', fg: '#fff', glyph: '🛺', size: 40 },
		self:        { bg: '#0a2e14', fg: '#fff', glyph: '●',  size: 28 }
	};

	function makeIcon(type: MapMarker['type'], pulse = false) {
		const d = iconDefs[type];
		const pulseHtml = pulse
			? `<span style="position:absolute;inset:-8px;border-radius:50%;background:${d.bg};opacity:0.2;animation:trikPulse 1.8s ease-out infinite;pointer-events:none"></span>`
			: '';
		return L.divIcon({
			html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:${d.size}px;height:${d.size}px">
				${pulseHtml}
				<div style="position:relative;z-index:1;background:${d.bg};width:${d.size}px;height:${d.size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${type==='rider'?'20':'12'}px;font-weight:700;color:${d.fg};border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.25)">
					${d.glyph}
				</div>
			</div>`,
			className: '',
			iconSize:   [d.size, d.size],
			iconAnchor: [d.size / 2, d.size / 2],
			popupAnchor:[0, -d.size / 2 - 4]
		});
	}

	function syncMarkers(currentMarkers: MapMarker[]) {
		if (!map || !L) return;

		const incoming = new Map(currentMarkers.map(m => [m.id, m]));

		// Remove stale markers
		for (const [id, lm] of markerRefs) {
			if (!incoming.has(id)) { map.removeLayer(lm); markerRefs.delete(id); }
		}

		// Add/update
		for (const [id, m] of incoming) {
			if (markerRefs.has(id)) {
				markerRefs.get(id).setLatLng([m.lat, m.lng]);
			} else {
				const icon = makeIcon(m.type, m.pulse ?? false);
				const lm = L.marker([m.lat, m.lng], { icon });
				if (m.label) lm.bindPopup(`<b>${m.label}</b>`, { className: 'trik-popup' });
				lm.addTo(map);
				markerRefs.set(id, lm);
			}
		}

		// Route line between pickup and destination (straight dashed — upgrade to OSRM later)
		const pickup = currentMarkers.find(m => m.type === 'pickup');
		const dest   = currentMarkers.find(m => m.type === 'destination');
		if (pickup && dest) {
			if (routeLine) map.removeLayer(routeLine);
			routeLine = L.polyline([[pickup.lat, pickup.lng], [dest.lat, dest.lng]], {
				color: '#16a34a', weight: 3, dashArray: '8 10', opacity: 0.6
			}).addTo(map);
		} else if (routeLine) {
			map.removeLayer(routeLine);
			routeLine = null;
		}

		// Auto-fit bounds to show all markers
		if (autoFit && currentMarkers.length > 1) {
			const bounds = L.latLngBounds(currentMarkers.map(m => [m.lat, m.lng]));
			map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
		}
	}

	onMount(async () => {
		L = (await import('leaflet')).default;

		// Inject pulse keyframes once globally
		if (!document.getElementById('trik-map-style')) {
			const s = document.createElement('style');
			s.id = 'trik-map-style';
			s.textContent = `
				@keyframes trikPulse {
					0%   { transform: scale(1);   opacity: 0.25; }
					70%  { transform: scale(2.4); opacity: 0;    }
					100% { transform: scale(1);   opacity: 0;    }
				}
				.trik-popup .leaflet-popup-content-wrapper {
					border-radius: 12px;
					font-family: 'DM Sans', sans-serif;
					font-size: 13px;
					box-shadow: 0 4px 20px rgba(0,0,0,0.12);
				}
			`;
			document.head.appendChild(s);
		}

		map = L.map(mapEl, { zoomControl: true, attributionControl: false })
			.setView(center, zoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19
		}).addTo(map);

		L.control.attribution({ prefix: false, position: 'bottomright' })
			.addAttribution('© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>')
			.addTo(map);

		ready = true;
	});

	onDestroy(() => {
		if (map) { map.remove(); map = null; }
	});

	// Sync markers whenever ready or markers prop changes
	$effect(() => {
		if (!ready) return;
		syncMarkers(markers);
	});

	// Recenter (only when no autoFit) when center prop changes
	$effect(() => {
		if (!ready || !map || autoFit) return;
		center; // track
		map.setView(center, zoom);
	});
</script>

<div bind:this={mapEl} class={className} style="height: {height}; width: 100%;"></div>
