<script lang="ts">
	import * as Card from '$lib/components/ui/card/index';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>
<div>
    Today is {data.day}
</div>
<Card.Root>
	<Card.Header>
		<Card.Title>Card Title</Card.Title>
		<Card.Description>Card Description</Card.Description>
	</Card.Header>
	<Card.Content>
		<p>Card Content</p>
	</Card.Content>
	<Card.Footer>
		<p>Card Footer</p>
	</Card.Footer>
</Card.Root>
