import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { pool } from '$lib/server/db';

const TYPES = ['focus', 'short', 'long'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH = 1000;

interface InSession {
	id: string;
	type: string;
	minutes: number;
	task: string;
	endedAt: string;
}

function parseSessions(raw: unknown): InSession[] | null {
	if (!Array.isArray(raw) || raw.length > MAX_BATCH) return null;
	const out: InSession[] = [];
	const limit = Date.now() + 24 * 3600_000;
	for (const s of raw) {
		if (
			typeof s?.id !== 'string' ||
			!UUID.test(s.id) ||
			!TYPES.includes(s.type) ||
			!Number.isInteger(s.minutes) ||
			s.minutes < 1 ||
			s.minutes > 240 ||
			typeof s.endedAt !== 'string' ||
			!(Date.parse(s.endedAt) <= limit)
		)
			return null;
		out.push({
			id: s.id,
			type: s.type,
			minutes: s.minutes,
			task: typeof s.task === 'string' ? s.task.slice(0, 80) : '',
			endedAt: new Date(s.endedAt).toISOString()
		});
	}
	return out;
}

function parseSettings(raw: unknown) {
	const s = raw as { data?: Record<string, unknown>; updatedAt?: unknown } | undefined;
	if (!s?.data || typeof s.updatedAt !== 'number' || s.updatedAt <= 0) return null;
	const { focus, short, long, sound, seconds, flip3d, date, battery } = s.data;
	const okMin = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 120;
	if (!okMin(focus) || !okMin(short) || !okMin(long) || typeof sound !== 'boolean') return null;
	// `seconds` llegó después: los clientes antiguos no lo envían
	if (seconds !== undefined && typeof seconds !== 'boolean') return null;
	if (flip3d !== undefined && typeof flip3d !== 'boolean') return null;
	if (date !== undefined && typeof date !== 'boolean') return null;
	if (battery !== undefined && typeof battery !== 'boolean') return null;
	return {
		data: { focus, short, long, sound, seconds: seconds ?? true, flip3d: flip3d ?? true, date: date ?? true, battery: battery ?? true },
		updatedAt: s.updatedAt
	};
}

async function currentUserId(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	return session?.user.id ?? null;
}

/** Sube lo pendiente del cliente (idempotente) y devuelve el estado completo del usuario. */
export const POST: RequestHandler = async ({ request }) => {
	const uid = await currentUserId(request);
	if (!uid) return json({ error: 'No autenticado' }, { status: 401 });

	const body = await request.json().catch(() => null);
	const sessions = parseSessions(body?.sessions ?? []);
	if (!sessions) return json({ error: 'Sesiones inválidas' }, { status: 400 });
	const settings = body?.settings === undefined ? null : parseSettings(body.settings);

	if (sessions.length > 0) {
		await pool.query(
			`INSERT INTO pomodoros (id, user_id, type, minutes, task, ended_at)
			 SELECT id, $1, type, minutes, task, ended_at
			 FROM unnest($2::uuid[], $3::text[], $4::int[], $5::text[], $6::timestamptz[])
			   AS t(id, type, minutes, task, ended_at)
			 ON CONFLICT (id) DO NOTHING`,
			[
				uid,
				sessions.map((s) => s.id),
				sessions.map((s) => s.type),
				sessions.map((s) => s.minutes),
				sessions.map((s) => s.task),
				sessions.map((s) => s.endedAt)
			]
		);
	}

	if (settings) {
		await pool.query(
			`INSERT INTO user_settings (user_id, data, updated_at)
			 VALUES ($1, $2, to_timestamp($3 / 1000.0))
			 ON CONFLICT (user_id) DO UPDATE
			   SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
			   WHERE user_settings.updated_at < EXCLUDED.updated_at`,
			[uid, settings.data, settings.updatedAt]
		);
	}

	const [rows, stored] = await Promise.all([
		pool.query(
			`SELECT id, type, minutes, task, ended_at FROM pomodoros
			 WHERE user_id = $1 ORDER BY ended_at`,
			[uid]
		),
		pool.query(
			`SELECT data, (extract(epoch FROM updated_at) * 1000)::bigint AS updated_at
			 FROM user_settings WHERE user_id = $1`,
			[uid]
		)
	]);

	return json({
		sessions: rows.rows.map((r) => ({
			id: r.id,
			type: r.type,
			minutes: r.minutes,
			task: r.task,
			endedAt: new Date(r.ended_at).toISOString()
		})),
		settings: stored.rows[0]
			? { data: stored.rows[0].data, updatedAt: Number(stored.rows[0].updated_at) }
			: null
	});
};

export const DELETE: RequestHandler = async ({ request }) => {
	const uid = await currentUserId(request);
	if (!uid) return json({ error: 'No autenticado' }, { status: 401 });
	await pool.query('DELETE FROM pomodoros WHERE user_id = $1', [uid]);
	return json({ ok: true });
};
