<script lang="ts">
	import { onMount } from 'svelte';
	import Battery from '$lib/Battery.svelte';
	import FlipClock from '$lib/FlipClock.svelte';
	import Dashboard from '$lib/Dashboard.svelte';
	import SettingsModal from '$lib/SettingsModal.svelte';
	import TaskModal from '$lib/TaskModal.svelte';
	import { battery } from '$lib/device-battery.svelte';
	import { pomodoro, type Mode } from '$lib/pomodoro.svelte';

	const MODES: { id: Mode; label: string }[] = [
		{ id: 'clock', label: 'Reloj' },
		{ id: 'focus', label: 'Foco' },
		{ id: 'short', label: 'Corto' },
		{ id: 'long', label: 'Largo' }
	];

	let modal = $state<'task' | 'dashboard' | 'settings' | null>(null);

	/** Un foco nuevo pregunta primero la tarea; el resto alterna pausa/inicio. */
	function startOrToggle() {
		if (pomodoro.needsTask) modal = 'task';
		else pomodoro.toggle();
	}

	function startWithTask(task: string) {
		pomodoro.task = task;
		modal = null;
		pomodoro.toggle();
	}

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
		void pomodoro.loadUser();
		let stopBattery = () => {};
		void battery.init().then((stop) => (stopBattery = stop));
		const id = setInterval(pomodoro.tick, 250);
		const onVisible = () => {
			if (document.visibilityState === 'visible') {
				pomodoro.tick();
				void requestWakeLock();
				void pomodoro.sync();
			}
		};
		document.addEventListener('visibilitychange', onVisible);
		void requestWakeLock();
		showMenu();
		return () => {
			clearInterval(id);
			stopBattery();
			clearTimeout(hideTimer);
			document.removeEventListener('visibilitychange', onVisible);
			void wakeLock?.release();
		};
	});

	$effect(() => {
		document.documentElement.dataset.flip = pomodoro.settings.flip3d ? 'on' : 'off';
	});

	$effect(() => {
		const [a, b, c, d] = pomodoro.digits;
		const label = MODES.find((m) => m.id === pomodoro.mode)?.label;
		document.title = `${a}${b}:${c}${d} · ${label} · Patodoro`;
	});

	const dateText = $derived.by(() => {
		const d = new Date(pomodoro.now);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
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
	{#if pomodoro.settings.date}
		<time class="date" datetime={dateText}>{dateText}</time>
	{/if}
	{#if pomodoro.settings.battery && battery.supported}
		<div class="battery-slot"><Battery level={battery.level} charging={battery.charging} /></div>
	{/if}
	<button class="stage" onclick={startOrToggle} aria-label="Iniciar o pausar">
		<FlipClock digits={pomodoro.digits} seconds={pomodoro.secondsDigits} />
	</button>
	<p class="label" aria-live="polite">
		{label}{#if pomodoro.mode === 'focus' && pomodoro.task && pomodoro.running}
			<span class="task"> · {pomodoro.task}</span>{/if}
	</p>

	<nav class:hidden={!menuVisible}>
		{#each MODES as m (m.id)}
			<button class:active={pomodoro.mode === m.id} onclick={() => pomodoro.setMode(m.id)}>
				{m.label}
			</button>
		{/each}
		{#if pomodoro.mode !== 'clock'}
			<span class="sep"></span>
			<button onclick={startOrToggle}>{pomodoro.running ? 'Pausa' : 'Iniciar'}</button>
			<button onclick={() => pomodoro.skip()}>Saltar</button>
			<button onclick={() => pomodoro.reset()}>Reiniciar</button>
		{/if}
		<span class="sep"></span>
		<button onclick={() => (modal = 'dashboard')}>Historial</button>
		<button onclick={() => (modal = 'settings')}>
			Ajustes{#if pomodoro.user}<i class="dot" data-state={pomodoro.syncState}></i>{/if}
		</button>
	</nav>
</main>

{#if modal === 'task'}
	<TaskModal initial={pomodoro.task} onstart={startWithTask} onclose={() => (modal = null)} />
{:else if modal === 'dashboard'}
	<Dashboard
		sessions={pomodoro.sessions}
		onclear={() => pomodoro.clearSessions()}
		onclose={() => (modal = null)}
	/>
{:else if modal === 'settings'}
	<SettingsModal
		settings={pomodoro.settings}
		batteryStatus={battery.status}
		user={pomodoro.user}
		syncState={pomodoro.syncState}
		onchange={(patch) => pomodoro.updateSettings(patch)}
		onsignin={(e, p) => pomodoro.signIn(e, p)}
		onsignup={(e, p) => pomodoro.signUp(e, p)}
		onsignout={() => pomodoro.signOut()}
		onsync={() => pomodoro.sync()}
		onclose={() => (modal = null)}
	/>
{/if}

<style>
	main {
		position: fixed;
		inset: 0;
		/* fila 1 (1fr) + reloj (auto) + fila 3 (1fr): el reloj queda centrado y la fecha, centrada
		   en la fila 1, cae justo a la mitad entre el borde superior y la parte superior del reloj */
		display: grid;
		grid-template-rows: 1fr auto 1fr;
		justify-items: center;
	}
	.battery-slot {
		position: absolute;
		top: 3vh;
		right: 3vw;
	}
	.date {
		grid-row: 1;
		align-self: center;
		font-family: 'Roboto Condensed', sans-serif;
		font-weight: 700;
		font-size: clamp(1rem, 4.5vh, 2.6rem);
		letter-spacing: 0.18em;
		color: #777;
		font-variant-numeric: tabular-nums;
	}
	.stage {
		grid-row: 2;
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
	.task {
		text-transform: none;
		letter-spacing: 0.05em;
		color: #999;
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
	.dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		margin-left: 0.4rem;
		border-radius: 50%;
		background: #666;
	}
	.dot[data-state='ok'] {
		background: #3cb043;
	}
	.dot[data-state='error'] {
		background: #e6a12e;
	}
	.sep {
		width: 1px;
		background: #222;
		margin: 0 0.3rem;
	}
</style>
