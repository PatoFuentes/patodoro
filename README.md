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

- [ ] Reloj flip (`FlipDigit`, `FlipClock`)
- [ ] Pomodoro: foco 25 / corto 5 / largo 15, con fin calculado por `Date.now()`
- [ ] PWA: manifest, service worker, íconos PNG desde `static/icon.svg`
- [ ] Deploy en Coolify

## Pendiente para la fase 2 (no perder)

- **Nombre de tarea** antes de cada sesión de foco.
- **Dashboard diario**: sesiones completadas, tiempo de foco y de descanso.

La v1 ya debe guardar cada sesión completada en `localStorage` con un campo `task`
(vacío por ahora) para que el seguimiento previo no se pierda cuando llegue la UI.
