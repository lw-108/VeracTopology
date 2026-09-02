/**
 * Apache AGE Driver & Query Execution Module
 *
 * Connects to PostgreSQL and executes OpenCypher queries via Apache AGE.
 * Thread-safe singleton pool instance with session-level AGE initialization.
 */

import { Pool } from 'pg';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'postgresql://graphos:Password@123@localhost:5432/graphos';

  _pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return _pool;
}

export function isAgeConfigured(): boolean {
  return !!(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_HOST
  );
}

/**
 * Parses AGE agtype string or json representation into clean object
 */
function parseAgtype(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    // Strip AGE type annotator e.g., ::vertex, ::edge, ::numeric
    const clean = value.replace(/::[a-zA-Z0-9_]+$/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch {
      return clean;
    }
  }
  return value;
}

/**
 * Execute an OpenCypher query inside PostgreSQL Apache AGE.
 *
 * @param cypherQuery - OpenCypher query (e.g. `MATCH (n:Entity) RETURN n`)
 * @param columnDefs  - AGE return signature (e.g. 'n agtype' or 'source agtype, target agtype, relType agtype')
 */
export async function runAgeQuery<T = any>(
  cypherQuery: string,
  columnDefs: string = 'v agtype'
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    // Initialize session search path for Apache AGE
    await client.query(`LOAD 'age';`);
    await client.query(`SET search_path = ag_catalog, "$user", public;`);

    const sql = `
      SELECT * FROM cypher('graphos', $$
        ${cypherQuery}
      $$) as (${columnDefs});
    `;

    const result = await client.query(sql);

    return result.rows.map((row) => {
      const keys = Object.keys(row);
      if (keys.length === 1) {
        return parseAgtype(row[keys[0]]);
      }
      const parsedRow: Record<string, any> = {};
      for (const k of keys) {
        parsedRow[k] = parseAgtype(row[k]);
      }
      return parsedRow;
    }) as T[];
  } finally {
    client.release();
  }
}

/**
 * Graceful pool teardown
 */
export async function closeAgePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
