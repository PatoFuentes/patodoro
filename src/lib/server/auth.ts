import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { pool } from './db';

export const auth = betterAuth({
	database: pool,
	// `vite build` analiza este módulo sin variables de runtime: solo ahí se admite un relleno.
	// En runtime, si falta el secreto, Better Auth falla al arrancar (a propósito).
	secret: env.BETTER_AUTH_SECRET ?? (building ? 'build-only-placeholder-not-a-secret-value' : undefined),
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: (env.TRUSTED_ORIGINS ?? '').split(',').filter(Boolean),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		// DISABLE_SIGNUP=true cierra el registro una vez creada la cuenta propia
		disableSignUp: env.DISABLE_SIGNUP === 'true'
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
