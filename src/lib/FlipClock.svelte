<script lang="ts">
	import FlipDigit from './FlipDigit.svelte';

	let {
		digits,
		seconds = null
	}: { digits: [string, string, string, string]; seconds?: [string, string] | null } = $props();
</script>

<div class="clock" class:with-secs={seconds}>
	<div class="pair">
		<FlipDigit value={digits[0]} />
		<FlipDigit value={digits[1]} />
	</div>
	<div class="minutes">
		<div class="pair">
			<FlipDigit value={digits[2]} />
			<FlipDigit value={digits[3]} />
		</div>
		{#if seconds}
			<div class="pair secs">
				<FlipDigit value={seconds[0]} />
				<FlipDigit value={seconds[1]} />
			</div>
		{/if}
	</div>
</div>

<style>
	.clock {
		--main: min(64vh, 27vw);
		--h: var(--main);
		display: flex;
		gap: calc(var(--h) * 0.12);
		align-items: flex-start;
		justify-content: center;
	}
	.clock.with-secs {
		--main: min(54vh, 27vw);
	}
	.minutes {
		display: flex;
		flex-direction: column;
		/* los segundos quedan pegados al borde derecho del bloque de minutos */
		align-items: flex-end;
		gap: calc(var(--main) * 0.06);
	}
	.secs {
		--h: calc(var(--main) * 0.24);
	}
	.pair {
		display: flex;
		gap: calc(var(--h) * 0.04);
	}
</style>
