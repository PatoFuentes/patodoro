<script lang="ts">
	let { level, charging }: { level: number; charging: boolean } = $props();

	const pct = $derived(Math.round(Math.min(1, Math.max(0, level)) * 100));
	const low = $derived(pct <= 20 && !charging);
</script>

<div
	class="battery"
	class:low
	class:charging
	role="img"
	aria-label="Batería {pct}%{charging ? ', cargando' : ''}"
>
	<div class="body">
		<i class="fill" style="width: {pct}%"></i>
		{#if charging}
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
		{/if}
	</div>
	<b class="nub"></b>
	<span class="pct">{pct}%</span>
</div>

<style>
	.battery {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		color: #777;
		font-family: 'Roboto Condensed', sans-serif;
		font-weight: 700;
		font-size: clamp(0.9rem, 3.2vh, 1.4rem);
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums;
	}
	.body {
		position: relative;
		width: 2.4em;
		height: 1.1em;
		border: 2px solid currentColor;
		border-radius: 0.28em;
		padding: 2px;
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
	}
	.fill {
		display: block;
		height: 100%;
		background: currentColor;
		border-radius: 0.12em;
		transition: width 0.6s ease;
	}
	.nub {
		width: 0.18em;
		height: 0.45em;
		background: currentColor;
		border-radius: 0 0.1em 0.1em 0;
	}
	.pct {
		margin-left: 0.5em;
	}
	.low {
		color: #e63b2e;
	}
	.charging {
		color: #3cb043;
	}
	svg {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 0.85em;
		height: 0.85em;
		fill: #000;
		stroke: currentColor;
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
</style>
