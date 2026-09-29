export type Mode = 'clock' | 'focus' | 'short' | 'long';
type TimerMode = Exclude<Mode, 'clock'>;

export interface Session {
	type: TimerMode;
	minutes: number;
	task: string;
	endedAt: string;
}

const DURATIONS: Record<TimerMode, number> = { focus: 25, short: 5, long: 15 };
const CYCLES_BEFORE_LONG = 4;
const SESSIONS_KEY = 'patodoro.sessions';

function loadSessions(): Session[] {
	try {
		return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
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

	#endAt = 0;
	#pausedMs = 0;
	#audio: AudioContext | null = null;

	get totalMs() {
		return this.mode === 'clock' ? 0 : DURATIONS[this.mode] * 60_000;
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
		const sessions = loadSessions();
		// `task` queda vacío hasta que exista el nombre de tarea (fase 2)
		sessions.push({
			type,
			minutes: DURATIONS[type],
			task: '',
			endedAt: new Date().toISOString()
		});
		saveSessions(sessions);
		this.#alarm();
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
