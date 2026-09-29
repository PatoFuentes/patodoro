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
- **Historial (dashboard):** vistas Día, Semana y Mes con flechas para navegar por fechas.
  Muestra focos, tiempo concentrado y de descanso, y racha de días con algún foco. El gráfico
  es por hora (día), por día (semana) o un calendario de calor (mes); tocar un día abre su
  detalle. Incluye desglose de tiempo por tarea y la lista de sesiones del día.
  Borrar historial pide confirmación.
- **Ajustes:** duración de foco, descanso corto y largo (1 a 120 min), sonido, fecha dd-mm-aaaa sobre el reloj, segundos bajo los minutos en el modo Reloj y animación 3D (apagada, los dígitos cambian al instante).

## Cuenta y sincronización (fase 3)

Opcional: sin cuenta todo funciona local, con `localStorage`. En **Ajustes → Cuenta** se puede
iniciar sesión (Better Auth, correo y contraseña) y el historial y los ajustes se sincronizan
con Postgres entre dispositivos. Cada sesión lleva un id (uuid) generado en el cliente, así que
reenviar es idempotente; los ajustes resuelven conflictos por última modificación.

- Esquema: `db/schema.sql` (base `patodoro` en el Postgres compartido `apps-db` del VPS).
- Variables de entorno: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`,
  `ORIGIN` (sin `ORIGIN`, adapter-node asume https y Better Auth no monta `/api/auth`).
- `DISABLE_SIGNUP=true` cierra el registro una vez creada la cuenta propia.
- Sin recuperación de contraseña: no hay servicio de correo configurado.

Para desarrollo local se necesita un `.env` con esas variables y acceso a un Postgres
(por ejemplo con un túnel SSH); arrancar con `node --env-file=.env build/index.js`.
