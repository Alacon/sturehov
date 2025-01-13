<script lang="ts">
	import * as Card from '$lib/components/ui/card/index';

	let { field, hour, title } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{title}</Card.Title>
	</Card.Header>
	<Card.Content>
		<ul>
			{#each Object.keys(field) as item}
				{@const [from, to] = item.split('-')}
				{@const active = hour >= +from && hour < +to}
				<li
					class="flex items-center justify-between {active
						? 'scale-110 bg-slate-200 p-2 text-xl'
						: ''}"
				>
					<div>{from}-{to}</div>
					<div>{field[item]}</div>
				</li>
			{/each}
		</ul>
	</Card.Content>
</Card.Root>
