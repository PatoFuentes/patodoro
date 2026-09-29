-- Esquema de Patodoro. Aplicar como el rol `patodoro` sobre la base `patodoro`:
--   ssh vps "sudo docker exec -i <apps-db> psql -U patodoro -d patodoro" < db/schema.sql
-- Es idempotente (IF NOT EXISTS).

-- Tablas core de Better Auth (nombres camelCase por defecto)
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userid_idx ON "session"("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_userid_idx ON "account"("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"("identifier");

-- Datos de la app. El id lo genera el cliente (uuid) para que reenviar sea idempotente.
CREATE TABLE IF NOT EXISTS pomodoros (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('focus', 'short', 'long')),
  minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 240),
  task text NOT NULL DEFAULT '',
  ended_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS pomodoros_user_ended_idx ON pomodoros (user_id, ended_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);
