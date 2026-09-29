<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		wide = false,
		onclose,
		children
	}: { title: string; wide?: boolean; onclose: () => void; children: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div
	class="backdrop"
	role="presentation"
	onpointerdown={(e) => e.target === e.currentTarget && onclose()}
>
	<div class="panel" class:wide role="dialog" aria-modal="true" aria-label={title}>
		<h2>{title}</h2>
		{@render children()}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
		background: rgba(0, 0, 0, 0.82);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 6vh 1rem 1rem;
		overflow-y: auto;
	}
	.panel {
		width: min(34rem, 100%);
		box-sizing: border-box;
		background: #121212;
		border: 1px solid #262626;
		border-radius: 1rem;
		padding: 1.4rem;
		color: #d8d8d8;
		user-select: text;
	}
	.panel.wide {
		width: min(46rem, 100%);
	}
	h2 {
		margin: 0 0 1rem;
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #888;
	}
</style>
