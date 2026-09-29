<script lang="ts">
	import { onMount } from 'svelte';
	import FlipClock from '$lib/FlipClock.svelte';
	import { pomodoro, type Mode } from '$lib/pomodoro.svelte';

	const MODES: { id: Mode; label: string }[] = [
		{ id: 'clock', label: 'Reloj' },
		{ id: 'focus', label: 'Foco' },
		{ id: 'short', label: 'Corto' },
		{ id: 'long', label: 'Largo' }
	];

	let menuVisible = $state(true);
	let hideTimer: ReturnType<typeof setTimeout>;
	let wakeLock: WakeLockSentinel | null = null;

	function showMenu() {
		menuVisible = true;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => (menuVisible = false), 3500);
	}

	async function requestWakeLock() {
		try {
			wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
		} catch {
			wakeLock = null;
		}
	}

	onMount(() => {
		pomodoro.setMode('clock');
		const id = setInterval(pomodoro.tick, 250);
		const onVisible = () => {
			if (document.visibilityState === 'visible') {
				pomodoro.tick();
				void requestWakeLock();
			}
		};
		document.addEventListener('visibilitychange', onVisible);
		void requestWakeLock();
		showMenu();
		return () => {
			clearInterval(id);
			clearTimeout(hideTimer);
			document.removeEventListener('visibilitychange', onVisible);
			void wakeLock?.release();
		};
	});

	$effect(() => {
		const [a, b, c, d] = pomodoro.digits;
		const label = MODES.find((m) => m.id === pomodoro.mode)?.label;
		document.title = `${a}${b}:${c}${d} · ${label} · Patodoro`;
	});

	const label = $derived(
		pomodoro.finished
			? '¡Listo!'
			: pomodoro.mode === 'clock'
				? ''
				: `${MODES.find((m) => m.id === pomodoro.mode)?.label}${pomodoro.running ? '' : ' · en pausa'}`
	);
</script>

<svelte:window onpointermove={showMenu} onpointerdown={showMenu} />

<main class:finished={pomodoro.finished}>
	<button class="stage" onclick={() => pomodoro.toggle()} aria-label="Iniciar o pausar">
		<FlipClock digits={pomodoro.digits} />
	</button>
	<p class="label" aria-live="polite">{label}</p>

	<nav class:hidden={!menuVisible}>
		{#each MODES as m (m.id)}
			<button class:active={pomodoro.mode === m.id} onclick={() => pomodoro.setMode(m.id)}>
				{m.label}
			</button>
		{/each}
		{#if pomodoro.mode !== 'clock'}
			<span class="sep"></span>
			<button onclick={() => pomodoro.toggle()}>{pomodoro.running ? 'Pausa' : 'Iniciar'}</button>
			<button onclick={() => pomodoro.skip()}>Saltar</button>
			<button onclick={() => pomodoro.reset()}>Reiniciar</button>
		{/if}
	</nav>
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.stage {
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		color: inherit;
	}
	.label {
		position: absolute;
		top: 4vh;
		margin: 0;
		font-size: 1.1rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #666;
	}
	.finished .label {
		color: #e63b2e;
	}
	nav {
		position: absolute;
		bottom: 3vh;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		transition: opacity 0.4s;
	}
	nav.hidden {
		opacity: 0;
		pointer-events: none;
	}
	nav button {
		background: #111;
		border: 1px solid #222;
		color: #999;
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		cursor: pointer;
	}
	nav button.active {
		color: #fff;
		border-color: #e63b2e;
	}
	.sep {
		width: 1px;
		background: #222;
		margin: 0 0.3rem;
	}
</style>
