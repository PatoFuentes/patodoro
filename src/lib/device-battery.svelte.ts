// Battery Status API: solo Chromium (Chrome/Edge, incluido Android) y en contexto seguro.
// No existe en Safari/iOS ni en Firefox; ahí `supported` queda en false y no se muestra nada.
interface BatteryManager extends EventTarget {
	level: number;
	charging: boolean;
}

class BatteryState {
	supported = $state(false);
	level = $state(1);
	charging = $state(false);

	/** Empieza a escuchar; devuelve la función que deja de hacerlo. */
	async init(): Promise<() => void> {
		const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
		if (!nav.getBattery) return () => {};
		try {
			const manager = await nav.getBattery();
			const update = () => {
				this.level = manager.level;
				this.charging = manager.charging;
			};
			update();
			this.supported = true;
			manager.addEventListener('levelchange', update);
			manager.addEventListener('chargingchange', update);
			return () => {
				manager.removeEventListener('levelchange', update);
				manager.removeEventListener('chargingchange', update);
			};
		} catch {
			// bloqueada por política de permisos: se trata como no disponible
			return () => {};
		}
	}
}

export const battery = new BatteryState();
