<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="h-screen sm:h-full min-h-[60vh] space-y-4 px-4 py-8 relative">
	{@render children()}
</div>
