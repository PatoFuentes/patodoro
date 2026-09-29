# Patodoro

Reloj flip minimalista con sesiones Pomodoro, instalable como PWA en la tablet.
SvelteKit + `adapter-node`, desplegado en el VPS `patricio` vía Coolify.


## Desarrollo

```
npm install
npm run dev
npm run build && npm start   # servidor de producción (build/index.js)
```

## Estado

- [x] Reloj flip (`FlipDigit`, `FlipClock`)
- [x] Pomodoro: foco 25 / corto 5 / largo 15, con fin calculado por `Date.now()`
- [x] PWA: manifest, service worker, íconos PNG (`node scripts/icons.mjs`)
- [x] Deploy en Coolify: https://patodoro.168.129.176.183.sslip.io

## Fase 2 (hecha)

- **Nombre de tarea:** al iniciar un foco nuevo se pregunta en qué vas a trabajar (opcional).
- **Dashboard "Hoy":** focos, tiempo concentrado y de descanso, barras de los últimos 7 días
  y lista de sesiones del día. Borrar historial pide confirmación.
- **Ajustes:** duración de foco, descanso corto y largo (1 a 120 min) y sonido.

Todo se guarda en `localStorage` (`patodoro.sessions`, `patodoro.settings`); no hay base de datos.
