/**
 * Shared PostgreSQL Pool — Singleton
 *
 * Single connection pool for all direct Postgres access.
 * Used by entityService (relational writes) and can be used
 * alongside lib/age.ts for Apache AGE graph queries.
 *
 * Server-side only. Never import from client components.
 */

import { Pool } from 'pg';

let _pool: Pool | null = null;

export function getPgPool(): Pool {
  if (_pool) return _pool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'postgresql://graphos:Password@123@localhost:5432/graphos';

  _pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _pool.on('error', (err) => {
    console.error('[pg] Unexpected pool error:', err.message);
  });

  return _pool;
}

export function isPgConfigured(): boolean {
  return !!(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_HOST
  );
}

/**
 * Graceful pool teardown — call in scripts after work is done.
 */
export async function closePgPool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
