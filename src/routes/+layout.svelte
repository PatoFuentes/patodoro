<script lang="ts">
	import '@fontsource/roboto-condensed/700.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/icon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/icons/icon-192.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#000000" />
	<title>Patodoro</title>
</svelte:head>

{@render children()}

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
		background: #000;
		color: #d8d8d8;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		overflow: hidden;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
	}
	:global(button) {
		font: inherit;
	}
</style>
