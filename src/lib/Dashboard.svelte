<script lang="ts">
	import Modal from './Modal.svelte';
	import type { Session } from './pomodoro.svelte';

	let {
		sessions,
		onclear,
		onclose
	}: { sessions: Session[]; onclear: () => void; onclose: () => void } = $props();

	const TYPE_LABEL = { focus: 'Foco', short: 'Descanso corto', long: 'Descanso largo' } as const;
	const dayKey = (d: Date) => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD en hora local

	const today = $derived(
		sessions.filter((s) => dayKey(new Date(s.endedAt)) === dayKey(new Date()))
	);
	const focus = $derived(today.filter((s) => s.type === 'focus'));
	const focusMin = $derived(focus.reduce((n, s) => n + s.minutes, 0));
	const breakMin = $derived(
		today.filter((s) => s.type !== 'focus').reduce((n, s) => n + s.minutes, 0)
	);

	const week = $derived.by(() => {
		const days = Array.from({ length: 7 }, (_, i) => {
			const d = new Date();
			d.setDate(d.getDate() - (6 - i));
			return {
				key: dayKey(d),
				label: d.toLocaleDateString('es-CL', { weekday: 'short' }),
				min: 0
			};
		});
		for (const s of sessions) {
			if (s.type !== 'focus') continue;
			const day = days.find((d) => d.key === dayKey(new Date(s.endedAt)));
			if (day) day.min += s.minutes;
		}
		return days;
	});
	const weekMax = $derived(Math.max(1, ...week.map((d) => d.min)));

	const fmt = (min: number) =>
		min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
	const time = (iso: string) =>
		new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

	let confirming = $state(false);
</script>

<Modal title="Hoy" {onclose}>
	<div class="stats">
		<div><strong>{focus.length}</strong><span>{focus.length === 1 ? 'foco' : 'focos'}</span></div>
		<div><strong>{fmt(focusMin)}</strong><span>concentrado</span></div>
		<div><strong>{fmt(breakMin)}</strong><span>descanso</span></div>
	</div>

	<div class="week" role="img" aria-label="Minutos de foco de los últimos 7 días">
		{#each week as d (d.key)}
			<div class="col">
				<div
					class="bar"
					style="height: {Math.max(2, (d.min / weekMax) * 100)}%"
					title="{d.min} min"
				></div>
				<span>{d.label}</span>
			</div>
		{/each}
	</div>

	{#if today.length === 0}
		<p class="empty">Aún no hay sesiones hoy.</p>
	{:else}
		<ul>
			{#each [...today].reverse() as s (s.endedAt)}
				<li>
					<time>{time(s.endedAt)}</time>
					<span class="type" class:focus={s.type === 'focus'}>{TYPE_LABEL[s.type]}</span>
					<span class="task">{s.task || (s.type === 'focus' ? 'Sin nombre' : '')}</span>
					<span class="min">{s.minutes} min</span>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="actions">
		{#if sessions.length > 0}
			{#if confirming}
				<button
					class="danger"
					onclick={() => {
						onclear();
						confirming = false;
					}}
				>
					Confirmar: borrar todo el historial
				</button>
			{:else}
				<button onclick={() => (confirming = true)}>Borrar historial</button>
			{/if}
		{/if}
		<button class="done" onclick={onclose}>Cerrar</button>
	</div>
</Modal>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
		text-align: center;
	}
	.stats strong {
		display: block;
		font-size: 1.5rem;
		color: #fff;
	}
	.stats span {
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #777;
	}
	.week {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		height: 5.5rem;
		margin: 1.4rem 0 1rem;
	}
	.col {
		flex: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: 0.3rem;
	}
	.bar {
		width: 100%;
		background: #e63b2e;
		border-radius: 3px;
		min-height: 2px;
	}
	.col span {
		font-size: 0.7rem;
		color: #777;
		text-transform: capitalize;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 32vh;
		overflow-y: auto;
	}
	li {
		display: grid;
		grid-template-columns: 3.2rem 8.5rem 1fr auto;
		gap: 0.5rem;
		padding: 0.5rem 0;
		border-top: 1px solid #1d1d1d;
		align-items: baseline;
	}
	time,
	.min {
		color: #777;
		font-variant-numeric: tabular-nums;
	}
	.type {
		color: #888;
	}
	.type.focus {
		color: #ffd21f;
	}
	.task {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.empty {
		text-align: center;
		color: #666;
	}
	.actions {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	button {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #aaa;
		padding: 0.7rem 1.2rem;
		border-radius: 999px;
		cursor: pointer;
	}
	.danger {
		border-color: #e63b2e;
		color: #e63b2e;
	}
	.done {
		margin-left: auto;
		background: #e63b2e;
		border-color: #e63b2e;
		color: #fff;
	}
</style>
