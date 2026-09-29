import pg from 'pg';
import { env } from '$env/dynamic/private';

// No validar en el import: durante `vite build` SvelteKit analiza los módulos del
// servidor sin variables de entorno. pg.Pool solo falla al intentar conectar.
export const pool = new pg.Pool({
	connectionString: env.DATABASE_URL,
	max: 5
});
