<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="container">
	{@render children()}
</div>
