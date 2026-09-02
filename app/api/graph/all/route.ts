/**
 * GET /api/graph/all
 *
 * Returns all nodes and edges.
 * Priority order:
 *   1. PostgreSQL Apache AGE (if AGE extension installed)
 *   2. PostgreSQL relational tables: entities + edges (Postgres-only mode)
 *   3. Hardcoded default topology (last-resort fallback)
 */

import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import { getPgPool, isPgConfigured } from '@/lib/pg';
import { DEFAULT_NODES, DEFAULT_EDGES } from '@/lib/default-topology';
import type { EntityData, GraphEdge } from '@/types/graph';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isDev = process.env.NODE_ENV === 'development';
  const start = performance.now();

  // ── 1. Primary: PostgreSQL Apache AGE (if AGE extension installed) ──────────
  if (isAgeConfigured()) {
    try {
      const nodeRows = await runAgeQuery<any>(
        `MATCH (n:Entity) RETURN n`,
        `n agtype`
      );

      const edgeRows = await runAgeQuery<any>(
        `MATCH (a:Entity)-[r]->(b:Entity) RETURN a.id, b.id, type(r)`,
        `source agtype, target agtype, relType agtype`
      );

      const nodes: EntityData[] = nodeRows.map((r: any) => {
        const props = r?.properties || r || {};
        return {
          id: props.id,
          label: props.label || (props.id ? String(props.id).toUpperCase() : 'UNKNOWN'),
          kind: (props.kind || 'agent') as EntityData['kind'],
          val: props.val || 10,
          color: props.color || undefined,
          status: props.status || undefined,
          detail: props.detail || undefined,
        };
      });

      const edges: GraphEdge[] = edgeRows.map((r: any) => ({
        source: r.source,
        target: r.target,
        relType: r.relType,
      }));

      if (nodes.length > 0) {
        const ms = performance.now() - start;
        if (isDev) {
          console.log(`[graph-api/all] Apache AGE: ${ms.toFixed(1)}ms | Nodes: ${nodes.length} | Edges: ${edges.length}`);
        }
        return NextResponse.json({ nodes, edges, source: 'live-apache-age' });
      }
    } catch (ageErr) {
      if (isDev) console.warn('[graph-api/all] Apache AGE query failed, trying Postgres tables:', ageErr);
    }
  }

  // ── 2. Postgres Relational Tables (entities + edges) ───────────────────────
  if (isPgConfigured()) {
    try {
      const pool = getPgPool();

      const [entityResult, edgeResult] = await Promise.all([
        pool.query(`
          SELECT id, label, kind, val, color, status, detail
          FROM entities
          ORDER BY
            CASE kind
              WHEN 'core'   THEN 1
              WHEN 'pillar' THEN 2
              WHEN 'agent'  THEN 3
              WHEN 'task'   THEN 4
              WHEN 'human'  THEN 5
              WHEN 'tool'   THEN 6
              ELSE 7
            END
        `),
        pool.query(`
          SELECT source_id AS source, target_id AS target, rel_type AS "relType"
          FROM edges
        `),
      ]);

      const nodes: EntityData[] = entityResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        kind: row.kind as EntityData['kind'],
        val: row.val ?? 10,
        color: row.color || undefined,
        status: row.status || undefined,
        detail: row.detail || undefined,
      }));

      const edges: GraphEdge[] = edgeResult.rows.map((row) => ({
        source: row.source,
        target: row.target,
        relType: row.relType || 'USES',
      }));

      if (nodes.length > 0) {
        const ms = performance.now() - start;
        if (isDev) {
          console.log(`[graph-api/all] Postgres tables: ${ms.toFixed(1)}ms | Nodes: ${nodes.length} | Edges: ${edges.length}`);
        }
        return NextResponse.json({ nodes, edges, source: 'live-postgres' });
      }
    } catch (pgErr) {
      if (isDev) console.warn('[graph-api/all] Postgres table query failed, using fallback topology:', pgErr);
    }
  }

  // ── 3. Last-Resort Fallback: hardcoded default topology ────────────────────
  if (isDev) console.log('[graph-api/all] Using hardcoded fallback topology');
  return NextResponse.json({
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
    source: 'fallback-topology',
  });
}
