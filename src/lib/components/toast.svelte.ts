export interface Toast {
	id: number;
	message: string;
	kind: 'success' | 'error' | 'info';
}

let toasts = $state<Toast[]>([]);
let nextId = 0;

export function getToasts() {
	return toasts;
}

export function pushToast(message: string, kind: Toast['kind'] = 'info') {
	const id = nextId++;
	toasts.push({ id, message, kind });
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, 3500);
}
