<script lang="ts">
	import Modal from './Modal.svelte';
	import type { Settings } from './pomodoro.svelte';

	let {
		settings,
		onchange,
		onclose
	}: { settings: Settings; onchange: (patch: Partial<Settings>) => void; onclose: () => void } =
		$props();

	const rows = [
		{ key: 'focus', label: 'Foco' },
		{ key: 'short', label: 'Descanso corto' },
		{ key: 'long', label: 'Descanso largo' }
	] as const;

	function step(key: (typeof rows)[number]['key'], delta: number) {
		onchange({ [key]: Math.min(120, Math.max(1, settings[key] + delta)) });
	}
</script>

<Modal title="Ajustes" {onclose}>
	{#each rows as row (row.key)}
		<div class="row">
			<span>{row.label}</span>
			<div class="stepper">
				<button aria-label="Menos {row.label}" onclick={() => step(row.key, -1)}>−</button>
				<output>{settings[row.key]} min</output>
				<button aria-label="Más {row.label}" onclick={() => step(row.key, 1)}>+</button>
			</div>
		</div>
	{/each}
	<div class="row">
		<span>Sonido al terminar</span>
		<button
			class="toggle"
			class:on={settings.sound}
			onclick={() => onchange({ sound: !settings.sound })}
		>
			{settings.sound ? 'Activado' : 'Silencio'}
		</button>
	</div>
	<div class="actions"><button class="done" onclick={onclose}>Listo</button></div>
</Modal>

<style>
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0;
		border-bottom: 1px solid #1d1d1d;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	output {
		min-width: 4.5rem;
		text-align: center;
	}
	button {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #ccc;
		border-radius: 999px;
		padding: 0.5rem 1rem;
		min-width: 2.6rem;
		cursor: pointer;
	}
	.toggle.on {
		border-color: #e63b2e;
		color: #fff;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 1rem;
	}
	.done {
		background: #e63b2e;
		border-color: #e63b2e;
		color: #fff;
		padding: 0.7rem 1.4rem;
	}
</style>
