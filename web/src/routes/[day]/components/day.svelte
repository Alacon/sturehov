<script lang="ts">
	import * as Card from '$lib/components/ui/card/index';
	import * as Table from '$lib/components/ui/table/index';

	let { hours, hour, title } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{title}</Card.Title>
	</Card.Header>
	<Card.Content>
		<Table.Root>
			<Table.Caption>Träningar för {hour}</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Tid</Table.Head>
					<Table.Head>KG1</Table.Head>
					<Table.Head>KG2</Table.Head>
					<Table.Head class="whitespace-nowrap">KG Extra</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each hours as item}
					<!-- content here -->
					{@const key = Object.keys(item)[0]}
					{@const [c1, c2, c3] = item[key]}
					<Table.Row class={key.startsWith(hour) ? 'bg-gray-100' : ''}>
						<Table.Cell class="whitespace-nowrap font-medium">{key}</Table.Cell>
						<Table.Cell>{c1}</Table.Cell>
						<Table.Cell>{c2}</Table.Cell>
						<Table.Cell>{c3}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content>
</Card.Root>
