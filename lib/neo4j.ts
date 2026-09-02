/**
 * Legacy Neo4j Connection Driver (Deprecated & Disabled)
 * System fully migrated to PostgreSQL + Apache AGE.
 */

export function isNeo4jConfigured(): boolean {
  return false;
}

export async function runQuery<T = any>(_query?: string, _params?: Record<string, any>): Promise<T[]> {
  throw new Error('Neo4j driver has been completely removed from this project. Use lib/age.ts for PostgreSQL + Apache AGE graph queries.');
}

export async function closeDriver(): Promise<void> {
  // No-op
}
