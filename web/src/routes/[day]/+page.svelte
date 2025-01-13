<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import type { PageData } from './$types';
	import Day from './components/day.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div>
	Today is {data.day}
</div>
{#if data?.kg1}
	<Day field={data.kg1} hour={data.hour} title="KG1" />
{/if}
{#if data?.kg2}
	<Day field={data.kg2} hour={data.hour} title="KG2" />
{/if}
{#if data?.kg_extra}
	<Day field={data.kg_extra} hour={data.hour} title="KG Extra" />
{/if}
<div class="flex flex-row items-center justify-between sticky bottom-0 p-4 bg-white">
	<Button href={data.previous} variant="link">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"></path></svg
		>{data.previous}
	</Button>
	<Button href={data.next} variant="link"
		>{data.next}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"></path></svg
		>
	</Button>
</div>
