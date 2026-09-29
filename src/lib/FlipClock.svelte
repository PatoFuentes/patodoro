<script lang="ts">
	import FlipDigit from './FlipDigit.svelte';

	let { digits }: { digits: [string, string, string, string] } = $props();
</script>

<div class="clock">
	<div class="pair">
		<FlipDigit value={digits[0]} />
		<FlipDigit value={digits[1]} />
	</div>
	<div class="pair">
		<FlipDigit value={digits[2]} />
		<FlipDigit value={digits[3]} />
	</div>
</div>

<style>
	.clock {
		--h: min(64vh, 27vw);
		display: flex;
		gap: calc(var(--h) * 0.12);
		align-items: center;
		justify-content: center;
	}
	.pair {
		display: flex;
		gap: calc(var(--h) * 0.04);
	}
</style>
