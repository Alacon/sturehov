<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class=" space-y-4 px-4 py-8">
	{@render children()}
</div>
