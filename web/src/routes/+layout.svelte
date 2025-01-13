<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="container space-y-4 py-8">
	{@render children()}
</div>
