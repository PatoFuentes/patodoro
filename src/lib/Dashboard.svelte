<script lang="ts">
	import Modal from './Modal.svelte';
	import type { Session } from './pomodoro.svelte';

	let {
		sessions,
		onclear,
		onclose
	}: { sessions: Session[]; onclear: () => void; onclose: () => void } = $props();

	type Range = 'day' | 'week' | 'month';
	const RANGES: { id: Range; label: string }[] = [
		{ id: 'day', label: 'Día' },
		{ id: 'week', label: 'Semana' },
		{ id: 'month', label: 'Mes' }
	];
	const TYPE_LABEL = { focus: 'Foco', short: 'Descanso corto', long: 'Descanso largo' } as const;

	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
	const dayKey = (d: Date) => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD en hora local

	let range = $state<Range>('day');
	let anchor = $state(startOfDay(new Date()));
	let confirming = $state(false);

	const todayStart = startOfDay(new Date());

	function boundsFor(r: Range, a: Date) {
		if (r === 'day') return { start: a, end: addDays(a, 1) };
		if (r === 'week') {
			const start = addDays(a, -((a.getDay() + 6) % 7)); // semana desde el lunes
			return { start, end: addDays(start, 7) };
		}
		const start = new Date(a.getFullYear(), a.getMonth(), 1);
		return { start, end: new Date(a.getFullYear(), a.getMonth() + 1, 1) };
	}

	const containsToday = (r: Range, a: Date) => {
		const b = boundsFor(r, a);
		return b.start <= todayStart && todayStart < b.end;
	};

	const bounds = $derived(boundsFor(range, anchor));

	const canNext = $derived(bounds.end.getTime() <= todayStart.getTime());
	const isCurrent = $derived(bounds.start <= todayStart && todayStart < bounds.end);

	function move(dir: number) {
		let next: Date;
		if (range === 'day') next = addDays(anchor, dir);
		else if (range === 'week') next = addDays(anchor, 7 * dir);
		else next = new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
		// al llegar al período actual, el ancla vuelve a ser hoy
		anchor = containsToday(range, next) ? todayStart : next;
	}

	function goTo(day: Date) {
		range = 'day';
		anchor = startOfDay(day);
	}

	function setRange(r: Range) {
		// cambiar de vista conserva el ancla; si se estaba en el período actual, es hoy
		if (isCurrent) anchor = todayStart;
		range = r;
	}

	const label = $derived.by(() => {
		if (range === 'day') {
			const l = anchor.toLocaleDateString('es-CL', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			});
			return isCurrent ? `Hoy · ${l}` : l;
		}
		if (range === 'week') {
			const f = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
			return `${f(bounds.start)} – ${f(addDays(bounds.end, -1))}`;
		}
		return anchor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
	});

	const inRange = $derived(
		sessions.filter((s) => {
			const t = new Date(s.endedAt);
			return t >= bounds.start && t < bounds.end;
		})
	);
	const focus = $derived(inRange.filter((s) => s.type === 'focus'));
	const focusMin = $derived(focus.reduce((n, s) => n + s.minutes, 0));
	const breakMin = $derived(
		inRange.filter((s) => s.type !== 'focus').reduce((n, s) => n + s.minutes, 0)
	);

	/** Minutos de foco por día, sobre todo el historial (calendario y racha). */
	const focusByDay = $derived.by(() => {
		const map = new Map<string, number>();
		for (const s of sessions) {
			if (s.type !== 'focus') continue;
			const k = dayKey(new Date(s.endedAt));
			map.set(k, (map.get(k) ?? 0) + s.minutes);
		}
		return map;
	});

	/** Días seguidos con algún foco; si hoy aún no hay, cuenta desde ayer. */
	const streak = $derived.by(() => {
		let day = todayStart;
		if (!focusByDay.has(dayKey(day))) day = addDays(day, -1);
		let n = 0;
		while (focusByDay.has(dayKey(day))) {
			n++;
			day = addDays(day, -1);
		}
		return n;
	});

	// --- gráficos ---
	const bars = $derived.by(() => {
		if (range === 'day') {
			const hours = Array.from({ length: 24 }, (_, h) => ({
				key: String(h),
				label: h % 6 === 0 ? String(h) : '',
				min: 0,
				day: null as Date | null
			}));
			for (const s of focus) hours[new Date(s.endedAt).getHours()].min += s.minutes;
			return hours;
		}
		return Array.from({ length: 7 }, (_, i) => {
			const d = addDays(bounds.start, i);
			return {
				key: dayKey(d),
				label: d.toLocaleDateString('es-CL', { weekday: 'short' }),
				min: focusByDay.get(dayKey(d)) ?? 0,
				day: d
			};
		});
	});
	const barMax = $derived(Math.max(1, ...bars.map((b) => b.min)));

	const calendar = $derived.by(() => {
		const first = bounds.start;
		const lead = (first.getDay() + 6) % 7;
		const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
		const cells: ({ day: Date; min: number } | null)[] = Array(lead).fill(null);
		for (let i = 0; i < daysInMonth; i++) {
			const d = addDays(first, i);
			cells.push({ day: d, min: focusByDay.get(dayKey(d)) ?? 0 });
		}
		return cells;
	});
	const calMax = $derived(Math.max(1, ...calendar.map((c) => c?.min ?? 0)));

	// --- por tarea ---
	const tasks = $derived.by(() => {
		const map = new Map<string, { min: number; count: number }>();
		for (const s of focus) {
			const name = s.task.trim() || 'Sin nombre';
			const cur = map.get(name) ?? { min: 0, count: 0 };
			cur.min += s.minutes;
			cur.count++;
			map.set(name, cur);
		}
		return [...map.entries()]
			.map(([name, v]) => ({ name, ...v }))
			.sort((a, b) => b.min - a.min)
			.slice(0, 8);
	});
	const taskMax = $derived(Math.max(1, ...tasks.map((t) => t.min)));

	const fmt = (min: number) =>
		min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
	const time = (iso: string) =>
		new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
</script>

<Modal title="Historial" wide {onclose}>
	<div class="top">
		<div class="tabs" role="tablist">
			{#each RANGES as r (r.id)}
				<button role="tab" aria-selected={range === r.id} class:on={range === r.id} onclick={() => setRange(r.id)}>
					{r.label}
				</button>
			{/each}
		</div>
		<div class="nav">
			<button aria-label="Anterior" onclick={() => move(-1)}>‹</button>
			<span class="label">{label}</span>
			<button aria-label="Siguiente" disabled={!canNext} onclick={() => move(1)}>›</button>
			{#if !isCurrent}<button class="today" onclick={() => (anchor = todayStart)}>Hoy</button>{/if}
		</div>
	</div>

	<div class="stats">
		<div><strong>{focus.length}</strong><span>{focus.length === 1 ? 'foco' : 'focos'}</span></div>
		<div><strong>{fmt(focusMin)}</strong><span>concentrado</span></div>
		<div><strong>{fmt(breakMin)}</strong><span>descanso</span></div>
		<div><strong>{streak}</strong><span>{streak === 1 ? 'día de racha' : 'días de racha'}</span></div>
	</div>

	{#if range === 'month'}
		<div class="cal-head">
			{#each ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as d, i (i)}<span>{d}</span>{/each}
		</div>
		<div class="cal">
			{#each calendar as c, i (i)}
				{#if c}
					<button
						class="cell"
						class:future={c.day > todayStart}
						style="--a: {c.min ? 0.25 + 0.75 * (c.min / calMax) : 0}"
						title="{c.day.getDate()}: {c.min} min"
						disabled={c.day > todayStart}
						onclick={() => goTo(c.day)}
					>
						{c.day.getDate()}
					</button>
				{:else}
					<span></span>
				{/if}
			{/each}
		</div>
	{:else}
		<div class="chart" class:hours={range === 'day'} role="img" aria-label="Minutos de foco">
			{#each bars as b (b.key)}
				<div class="col">
					{#if b.day}
						<button
							class="bar"
							style="height: {Math.max(2, (b.min / barMax) * 100)}%"
							title="{b.min} min"
							aria-label="{b.label}: {b.min} min"
							onclick={() => goTo(b.day!)}
						></button>
					{:else}
						<div class="bar" style="height: {Math.max(2, (b.min / barMax) * 100)}%" title="{b.min} min"></div>
					{/if}
					<span>{b.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if tasks.length > 0}
		<h3>Por tarea</h3>
		<ul class="tasks">
			{#each tasks as t (t.name)}
				<li>
					<div class="row">
						<span class="name" class:none={t.name === 'Sin nombre'}>{t.name}</span>
						<span class="min">{t.count} × · {fmt(t.min)}</span>
					</div>
					<div class="meter"><i style="width: {(t.min / taskMax) * 100}%"></i></div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if range === 'day'}
		<h3>Sesiones</h3>
		{#if inRange.length === 0}
			<p class="empty">No hay sesiones este día.</p>
		{:else}
			<ul class="list">
				{#each [...inRange].sort((a, b) => b.endedAt.localeCompare(a.endedAt)) as s (s.id)}
					<li>
						<time>{time(s.endedAt)}</time>
						<span class="type" class:focus={s.type === 'focus'}>{TYPE_LABEL[s.type]}</span>
						<span class="task">{s.task || (s.type === 'focus' ? 'Sin nombre' : '')}</span>
						<span class="min">{s.minutes} min</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if inRange.length === 0}
		<p class="empty">No hay sesiones en este período.</p>
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
	.top {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.2rem;
	}
	.tabs {
		display: flex;
		background: #0a0a0a;
		border: 1px solid #222;
		border-radius: 999px;
		padding: 0.2rem;
	}
	.tabs button {
		border: 0;
		background: none;
		color: #888;
		padding: 0.45rem 1rem;
		border-radius: 999px;
		cursor: pointer;
	}
	.tabs button.on {
		background: #e63b2e;
		color: #fff;
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.nav button {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #ccc;
		border-radius: 999px;
		min-width: 2.2rem;
		padding: 0.35rem 0.7rem;
		cursor: pointer;
	}
	.nav button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.label {
		min-width: 9rem;
		text-align: center;
		display: inline-block;
		color: #eee;
	}
	.label::first-letter {
		text-transform: uppercase;
	}
	.today {
		color: #e63b2e !important;
		border-color: #e63b2e !important;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.6rem;
		text-align: center;
	}
	.stats strong {
		display: block;
		font-size: 1.4rem;
		color: #fff;
	}
	.stats span {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #777;
	}
	.chart {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		height: 6.5rem;
		margin: 1.4rem 0 0.8rem;
	}
	.chart.hours {
		gap: 0.2rem;
	}
	.col {
		flex: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: 0.3rem;
		min-width: 0;
	}
	.bar {
		width: 100%;
		padding: 0;
		border: 0;
		background: #e63b2e;
		border-radius: 3px;
		min-height: 2px;
	}
	button.bar {
		cursor: pointer;
	}
	.col span {
		font-size: 0.7rem;
		color: #777;
		text-transform: capitalize;
		height: 0.9rem;
	}
	.cal-head,
	.cal {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.3rem;
	}
	.cal-head {
		margin: 1.2rem 0 0.3rem;
		text-align: center;
		font-size: 0.7rem;
		color: #777;
	}
	.cell {
		aspect-ratio: 1;
		border: 1px solid #222;
		border-radius: 0.4rem;
		background: rgb(230 59 46 / var(--a));
		color: #ddd;
		font-size: 0.8rem;
		cursor: pointer;
		padding: 0;
	}
	.cell.future {
		opacity: 0.3;
		cursor: default;
	}
	h3 {
		margin: 1.3rem 0 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #777;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tasks li {
		padding: 0.35rem 0;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.name.none {
		color: #777;
	}
	.meter {
		height: 4px;
		background: #1c1c1c;
		border-radius: 2px;
		margin-top: 0.3rem;
	}
	.meter i {
		display: block;
		height: 100%;
		background: #ffd21f;
		border-radius: 2px;
	}
	.list {
		max-height: 26vh;
		overflow-y: auto;
	}
	.list li {
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
		margin: 1.2rem 0 0;
	}
	.actions {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 1.4rem;
	}
	.actions button {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #aaa;
		padding: 0.7rem 1.2rem;
		border-radius: 999px;
		cursor: pointer;
	}
	.actions .danger {
		border-color: #e63b2e;
		color: #e63b2e;
	}
	.actions .done {
		margin-left: auto;
		background: #e63b2e;
		border-color: #e63b2e;
		color: #fff;
	}
</style>
