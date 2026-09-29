import { authClient } from './auth-client';

export type Mode = 'clock' | 'focus' | 'short' | 'long';
type TimerMode = Exclude<Mode, 'clock'>;

export interface Session {
	id: string;
	type: TimerMode;
	minutes: number;
	task: string;
	endedAt: string;
	/** true cuando el servidor ya lo tiene; solo importa con sesión iniciada */
	synced?: boolean;
}

export type SyncState = 'off' | 'syncing' | 'ok' | 'error';

export interface Settings {
	focus: number;
	short: number;
	long: number;
	sound: boolean;
	/** segundos bajo los minutos en el modo Reloj */
	seconds: boolean;
}

const DEFAULT_SETTINGS: Settings = { focus: 25, short: 5, long: 15, sound: true, seconds: true };
const CYCLES_BEFORE_LONG = 4;
const SESSIONS_KEY = 'patodoro.sessions';
const SETTINGS_KEY = 'patodoro.settings';
const SETTINGS_AT_KEY = 'patodoro.settingsAt';

function loadSettings(): Settings {
	try {
		return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

function saveSettings(settings: Settings) {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {
		// sin almacenamiento: los ajustes no se recuerdan
	}
}

function loadSettingsAt(): number {
	try {
		return Number(localStorage.getItem(SETTINGS_AT_KEY)) || 0;
	} catch {
		return 0;
	}
}

function saveSettingsAt(at: number) {
	try {
		localStorage.setItem(SETTINGS_AT_KEY, String(at));
	} catch {
		// sin almacenamiento
	}
}

function loadSessions(): Session[] {
	try {
		const raw: Partial<Session>[] = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
		// las sesiones de la fase 1 no tenían id
		return raw.map((s) => ({ ...s, id: s.id ?? crypto.randomUUID() }) as Session);
	} catch {
		return [];
	}
}

function saveSessions(sessions: Session[]) {
	try {
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
	} catch {
		// sin almacenamiento: la sesión simplemente no se recuerda
	}
}

class Pomodoro {
	mode = $state<Mode>('clock');
	running = $state(false);
	finished = $state(false);
	cycle = $state(0);
	now = $state(Date.now());
	task = $state('');
	settings = $state<Settings>(loadSettings());
	sessions = $state<Session[]>(loadSessions());
	user = $state<{ email: string } | null>(null);
	syncState = $state<SyncState>('off');

	#settingsAt = loadSettingsAt();
	#syncing = false;
	#syncAgain = false;
	#settingsTimer: ReturnType<typeof setTimeout> | undefined;

	#endAt = 0;
	#pausedMs = $state(0);
	#audio: AudioContext | null = null;

	get totalMs() {
		return this.mode === 'clock' ? 0 : this.settings[this.mode] * 60_000;
	}

	get remainingMs() {
		if (this.mode === 'clock') return 0;
		if (this.running) return Math.max(0, this.#endAt - this.now);
		return this.#pausedMs;
	}

	/** Dígitos a mostrar: HH:MM en modo reloj, MM:SS en modo temporizador. */
	get digits(): [string, string, string, string] {
		const pad = (n: number) => String(n).padStart(2, '0');
		let a: number, b: number;
		if (this.mode === 'clock') {
			const d = new Date(this.now);
			a = d.getHours();
			b = d.getMinutes();
		} else {
			const secs = Math.ceil(this.remainingMs / 1000);
			a = Math.floor(secs / 60);
			b = secs % 60;
		}
		const [a1, a2, b1, b2] = pad(a) + pad(b);
		return [a1, a2, b1, b2];
	}

	/** Un foco recién listo para arrancar: es el momento de preguntar la tarea. */
	get needsTask() {
		return this.mode === 'focus' && !this.running && this.#pausedMs === this.totalMs;
	}

	updateSettings(patch: Partial<Settings>) {
		this.settings = { ...this.settings, ...patch };
		this.#settingsAt = Date.now();
		saveSettings(this.settings);
		saveSettingsAt(this.#settingsAt);
		if (!this.running && this.mode !== 'clock') this.setMode(this.mode);
		// agrupa los toques rápidos de +/- en una sola sincronización
		clearTimeout(this.#settingsTimer);
		this.#settingsTimer = setTimeout(() => void this.sync(), 800);
	}

	clearSessions() {
		this.sessions = [];
		saveSessions([]);
		if (this.user) {
			fetch('/api/sync', { method: 'DELETE' }).catch(() => (this.syncState = 'error'));
		}
	}

	// --- Cuenta y sincronización (opcional: sin sesión todo sigue siendo local) ---

	async loadUser() {
		try {
			const { data } = await authClient.getSession();
			this.user = data?.user ? { email: data.user.email } : null;
		} catch {
			// sin red: se conserva el estado anterior
		}
		if (this.user) await this.sync();
		else this.syncState = 'off';
	}

	async signIn(email: string, password: string): Promise<string | null> {
		const { error } = await authClient.signIn.email({ email, password });
		if (error) return error.message ?? 'No se pudo iniciar sesión';
		await this.loadUser();
		return null;
	}

	async signUp(email: string, password: string): Promise<string | null> {
		const { error } = await authClient.signUp.email({
			email,
			password,
			name: email.split('@')[0]
		});
		if (error) return error.message ?? 'No se pudo crear la cuenta';
		await this.loadUser();
		return null;
	}

	async signOut() {
		await authClient.signOut();
		this.user = null;
		this.syncState = 'off';
		// al salir, el historial local deja de considerarse respaldado
		this.sessions = this.sessions.map((s) => ({ ...s, synced: false }));
		saveSessions(this.sessions);
	}

	/** Sube lo pendiente (idempotente) y fusiona lo que haya en el servidor. */
	async sync() {
		if (!this.user) return;
		if (this.#syncing) {
			this.#syncAgain = true;
			return;
		}
		this.#syncing = true;
		this.syncState = 'syncing';
		try {
			const pending = this.sessions
				.filter((s) => !s.synced)
				.map(({ id, type, minutes, task, endedAt }) => ({ id, type, minutes, task, endedAt }));
			const res = await fetch('/api/sync', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					sessions: pending,
					settings: this.#settingsAt ? { data: this.settings, updatedAt: this.#settingsAt } : undefined
				})
			});
			if (res.status === 401) {
				this.user = null;
				this.syncState = 'off';
				return;
			}
			if (!res.ok) throw new Error(String(res.status));
			const remote: { sessions: Session[]; settings: { data: Settings; updatedAt: number } | null } =
				await res.json();

			const byId = new Map(this.sessions.map((s) => [s.id, { ...s }]));
			for (const s of remote.sessions) byId.set(s.id, { ...s, synced: true });
			this.sessions = [...byId.values()].sort((a, b) => a.endedAt.localeCompare(b.endedAt));
			saveSessions(this.sessions);

			if (remote.settings && remote.settings.updatedAt > this.#settingsAt) {
				this.settings = { ...DEFAULT_SETTINGS, ...remote.settings.data };
				this.#settingsAt = remote.settings.updatedAt;
				saveSettings(this.settings);
				saveSettingsAt(this.#settingsAt);
				if (!this.running && this.mode !== 'clock') this.setMode(this.mode);
			}
			this.syncState = 'ok';
		} catch {
			this.syncState = 'error';
		} finally {
			this.#syncing = false;
			if (this.#syncAgain) {
				this.#syncAgain = false;
				void this.sync();
			}
		}
	}

	/** Segundos del reloj (solo modo Reloj); null cuando no corresponde mostrarlos. */
	get secondsDigits(): [string, string] | null {
		if (this.mode !== 'clock' || !this.settings.seconds) return null;
		const [a, b] = String(new Date(this.now).getSeconds()).padStart(2, '0');
		return [a, b];
	}

	tick = () => {
		this.now = Date.now();
		if (this.running && this.now >= this.#endAt) this.#complete();
	};

	setMode(mode: Mode) {
		this.mode = mode;
		this.running = false;
		this.finished = false;
		this.#pausedMs = this.totalMs;
	}

	toggle() {
		if (this.mode === 'clock') return;
		this.#unlockAudio();
		if (this.finished) this.setMode(this.mode);
		if (this.running) {
			this.#pausedMs = Math.max(0, this.#endAt - Date.now());
			this.running = false;
		} else {
			this.now = Date.now();
			this.#endAt = this.now + this.#pausedMs;
			this.running = true;
		}
	}

	reset() {
		if (this.mode !== 'clock') this.setMode(this.mode);
	}

	skip() {
		if (this.mode === 'clock') return;
		this.setMode(this.#nextMode());
	}

	#nextMode(): TimerMode {
		if (this.mode !== 'focus') return 'focus';
		return this.cycle % CYCLES_BEFORE_LONG === 0 ? 'long' : 'short';
	}

	#complete() {
		const type = this.mode as TimerMode;
		this.running = false;
		this.#pausedMs = 0;
		this.finished = true;
		if (type === 'focus') this.cycle++;
		this.sessions = [
			...this.sessions,
			{
				id: crypto.randomUUID(),
				type,
				minutes: this.settings[type],
				task: type === 'focus' ? this.task : '',
				endedAt: new Date().toISOString()
			}
		];
		saveSessions(this.sessions);
		void this.sync();
		if (this.settings.sound) this.#alarm();
		navigator.vibrate?.([300, 150, 300, 150, 600]);
		// deja lista la fase siguiente sin arrancarla
		const next = this.#nextMode();
		setTimeout(() => {
			if (this.finished && !this.running) {
				this.mode = next;
				this.#pausedMs = this.totalMs;
				this.finished = false;
			}
		}, 4000);
	}

	#unlockAudio() {
		try {
			this.#audio ??= new AudioContext();
			void this.#audio.resume();
		} catch {
			// sin audio
		}
	}

	#alarm() {
		const ctx = this.#audio;
		if (!ctx) return;
		[0, 0.35, 0.7].forEach((t) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = 880;
			gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
			gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
			osc.connect(gain).connect(ctx.destination);
			osc.start(ctx.currentTime + t);
			osc.stop(ctx.currentTime + t + 0.32);
		});
	}
}

export const pomodoro = new Pomodoro();
