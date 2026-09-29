// Battery Status API: solo Chromium (Chrome/Edge, incluido Android) y en contexto seguro.
// No existe en Safari/iOS ni en Firefox; ahí `supported` queda en false y no se muestra nada.
// Brave la expone pero devuelve siempre 100% y cargando (anti-fingerprinting), así que se trata
// como no disponible: mostrar ese dato sería mostrar un valor falso.
interface BatteryManager extends EventTarget {
	level: number;
	charging: boolean;
}

export type BatteryStatus = 'checking' | 'supported' | 'brave' | 'unsupported';

class BatteryState {
	status = $state<BatteryStatus>('checking');
	get supported() {
		return this.status === 'supported';
	}
	level = $state(1);
	charging = $state(false);

	/** Empieza a escuchar; devuelve la función que deja de hacerlo. */
	async init(): Promise<() => void> {
		const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
		if (!nav.getBattery) {
			this.status = 'unsupported';
			return () => {};
		}
		const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave;
		if (brave?.isBrave && (await brave.isBrave().catch(() => false))) {
			this.status = 'brave';
			return () => {};
		}
		try {
			const manager = await nav.getBattery();
			const update = () => {
				this.level = manager.level;
				this.charging = manager.charging;
			};
			update();
			this.status = 'supported';
			manager.addEventListener('levelchange', update);
			manager.addEventListener('chargingchange', update);
			return () => {
				manager.removeEventListener('levelchange', update);
				manager.removeEventListener('chargingchange', update);
			};
		} catch {
			// bloqueada por política de permisos: se trata como no disponible
			this.status = 'unsupported';
			return () => {};
		}
	}
}

export const battery = new BatteryState();
