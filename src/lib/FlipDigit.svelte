<script lang="ts">
	import { untrack } from 'svelte';

	let { value }: { value: string } = $props();

	let current = $state(untrack(() => value));
	let previous = $state(untrack(() => value));
	let flips = $state(0);

	$effect(() => {
		if (value !== untrack(() => current)) {
			previous = untrack(() => current);
			current = value;
			flips++;
		}
	});
</script>

<div class="digit">
	<div class="half top"><span>{current}</span></div>
	<div class="half bottom"><span>{previous}</span></div>
	{#key flips}
		{#if flips > 0}
			<div class="half top flap-top"><span>{previous}</span></div>
			<div class="half bottom flap-bottom" onanimationend={() => (previous = current)}>
				<span>{current}</span>
			</div>
		{/if}
	{/key}
	<div class="seam"></div>
</div>

<style>
	.digit {
		position: relative;
		width: calc(var(--h) * 0.72);
		height: var(--h);
		perspective: calc(var(--h) * 3);
		font-family: 'Oswald', sans-serif;
		font-weight: 600;
		font-size: calc(var(--h) * 0.86);
		line-height: 1;
	}
	.half {
		position: absolute;
		left: 0;
		width: 100%;
		height: 50%;
		overflow: hidden;
		background: #161616;
		backface-visibility: hidden;
	}
	.half span {
		position: absolute;
		left: 0;
		width: 100%;
		height: 200%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #d8d8d8;
	}
	.top {
		top: 0;
		border-radius: calc(var(--h) * 0.06) calc(var(--h) * 0.06) 0 0;
		transform-origin: bottom;
	}
	.top span {
		top: 0;
	}
	.bottom {
		bottom: 0;
		border-radius: 0 0 calc(var(--h) * 0.06) calc(var(--h) * 0.06);
		transform-origin: top;
		background: #101010;
	}
	.bottom span {
		bottom: 0;
	}
	.flap-top {
		animation: fold-down 0.28s ease-in forwards;
	}
	.flap-bottom {
		transform: rotateX(90deg);
		animation: fold-up 0.38s cubic-bezier(0.28, 0.02, 0.26, 1.15) 0.28s forwards;
	}
	.seam {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(50% - 1px);
		height: 2px;
		background: #000;
		z-index: 3;
	}
	@keyframes fold-down {
		to {
			transform: rotateX(-90deg);
		}
	}
	@keyframes fold-up {
		to {
			transform: rotateX(0deg);
		}
	}
</style>
