<script lang="ts">
	import Modal from './Modal.svelte';
	import type { Settings, SyncState } from './pomodoro.svelte';

	let {
		settings,
		user,
		syncState,
		onchange,
		onsignin,
		onsignup,
		onsignout,
		onsync,
		onclose
	}: {
		settings: Settings;
		user: { email: string } | null;
		syncState: SyncState;
		onchange: (patch: Partial<Settings>) => void;
		onsignin: (email: string, password: string) => Promise<string | null>;
		onsignup: (email: string, password: string) => Promise<string | null>;
		onsignout: () => void;
		onsync: () => void;
		onclose: () => void;
	} = $props();

	let creating = $state(false);
	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	const SYNC_LABEL: Record<SyncState, string> = {
		off: '',
		syncing: 'Sincronizando…',
		ok: 'Sincronizado',
		error: 'Sin conexión: se reintentará'
	};

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = await (creating ? onsignup : onsignin)(email.trim(), password);
		busy = false;
		if (!error) password = '';
	}

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
		<span>Fecha (dd-mm-aaaa)</span>
		<button class="toggle" class:on={settings.date} onclick={() => onchange({ date: !settings.date })}>
			{settings.date ? 'Activada' : 'Oculta'}
		</button>
	</div>
	<div class="row">
		<span>Animación 3D</span>
		<button
			class="toggle"
			class:on={settings.flip3d}
			onclick={() => onchange({ flip3d: !settings.flip3d })}
		>
			{settings.flip3d ? 'Activada' : 'Desactivada'}
		</button>
	</div>
	<div class="row">
		<span>Segundos en el reloj</span>
		<button
			class="toggle"
			class:on={settings.seconds}
			onclick={() => onchange({ seconds: !settings.seconds })}
		>
			{settings.seconds ? 'Activado' : 'Oculto'}
		</button>
	</div>
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

	<h3>Cuenta</h3>
	{#if user}
		<div class="account">
			<div>
				<div class="email">{user.email}</div>
				<div class="status" data-state={syncState}>
					<i></i>{SYNC_LABEL[syncState]}
				</div>
			</div>
			<div class="acts">
				<button onclick={onsync} disabled={syncState === 'syncing'}>Sincronizar</button>
				<button onclick={onsignout}>Cerrar sesión</button>
			</div>
		</div>
	{:else}
		<p class="hint">
			Sin cuenta, tu historial vive solo en este dispositivo. Inicia sesión para sincronizarlo
			entre dispositivos.
		</p>
		<form onsubmit={submit}>
			<input
				type="email"
				bind:value={email}
				placeholder="Correo"
				autocomplete="email"
				required
			/>
			<input
				type="password"
				bind:value={password}
				placeholder="Contraseña (mínimo 8)"
				autocomplete={creating ? 'new-password' : 'current-password'}
				minlength="8"
				required
			/>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<div class="acts">
				<button type="button" class="link" onclick={() => ((creating = !creating), (error = null))}>
					{creating ? 'Ya tengo cuenta' : 'Crear cuenta'}
				</button>
				<button class="done" type="submit" disabled={busy}>
					{creating ? 'Crear cuenta' : 'Iniciar sesión'}
				</button>
			</div>
		</form>
	{/if}
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
	h3 {
		margin: 1.4rem 0 0.6rem;
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #888;
	}
	.hint {
		margin: 0 0 0.8rem;
		color: #888;
		font-size: 0.9rem;
	}
	.account {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.email {
		color: #eee;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: #888;
	}
	.status i {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: #666;
	}
	.status[data-state='ok'] i {
		background: #3cb043;
	}
	.status[data-state='ok'] {
		color: #7fd685;
	}
	.status[data-state='error'] i {
		background: #e6a12e;
	}
	.acts {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		align-items: center;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	input {
		background: #0a0a0a;
		border: 1px solid #2a2a2a;
		border-radius: 0.6rem;
		color: #eee;
		padding: 0.8rem 1rem;
		font-size: 1rem;
	}
	input:focus {
		outline: none;
		border-color: #e63b2e;
	}
	.error {
		margin: 0;
		color: #e6795a;
		font-size: 0.9rem;
	}
	.link {
		background: none;
		border: 0;
		color: #999;
		text-decoration: underline;
	}
	button:disabled {
		opacity: 0.5;
	}
</style>
