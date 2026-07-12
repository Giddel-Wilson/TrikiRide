<script lang="ts">
	let { status }: { status: string } = $props();

	const styles: Record<string, string> = {
		pending:        'bg-amber-100 text-amber-700 border-amber-200',
		accepted:       'bg-blue-100 text-blue-700 border-blue-200',
		arrived_pickup: 'bg-violet-100 text-violet-700 border-violet-200',
		ongoing:        'bg-green-100 text-green-700 border-green-200',
		completed:      'bg-emerald-100 text-emerald-700 border-emerald-200',
		cancelled:      'bg-red-100 text-red-600 border-red-200',
		successful:     'bg-emerald-100 text-emerald-700 border-emerald-200',
		failed:         'bg-red-100 text-red-600 border-red-200'
	};

	const labels: Record<string, string> = {
		pending:        'Pending',
		accepted:       'On the way',
		arrived_pickup: 'Arrived at pickup',
		ongoing:        'In progress',
		completed:      'Completed',
		cancelled:      'Cancelled',
		successful:     'Successful',
		failed:         'Failed'
	};
</script>

<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium {styles[status] ?? styles.pending}">
	<span class="h-1.5 w-1.5 rounded-full bg-current"></span>
	{labels[status] ?? status}
</span>
