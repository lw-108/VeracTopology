import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import { getPgPool } from '@/lib/pg';
import type { NodeKind } from '@/types/graph';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, label, kind, status, detail, parentId, relType } = body as {
      id: string;
      label: string;
      kind: NodeKind;
      status?: string;
      detail?: string;
      parentId?: string;
      relType?: string;
    };

    if (!id || !label || !kind) {
      return NextResponse.json({ error: 'id, label, and kind are required' }, { status: 400 });
    }

    // ── 1. Try Apache AGE first (if installed) ─────────────────────────────
    if (isAgeConfigured()) {
      try {
        const createCypher = `
          MERGE (n:Entity {id: '${id}'})
          SET n.label = '${label}',
              n.kind = '${kind}',
              n.status = '${status || 'ACTIVE'}',
              n.detail = '${detail || `Custom ${kind} entity`}',
              n.val = 16
          RETURN n
        `;
        await runAgeQuery(createCypher, 'n agtype');

        if (parentId) {
          const relation = (relType || (kind === 'pillar' ? 'COMMANDS' : 'USES')).toUpperCase();
          const relCypher = `
            MATCH (p:Entity {id: '${parentId}'}), (c:Entity {id: '${id}'})
            CREATE (p)-[:${relation}]->(c)
            RETURN p
          `;
          await runAgeQuery(relCypher, 'p agtype');
        }

        return NextResponse.json({ success: true, source: 'apache-age' });
      } catch (ageErr: any) {
        console.warn('[graph-api/create] Apache AGE write error, falling through to Postgres:', ageErr);
      }
    }

    // ── 2. Postgres relational tables (Postgres-only mode) ─────────────────
    try {
      const pool = getPgPool();

      // Upsert the entity
      await pool.query(
        `INSERT INTO entities (id, label, kind, val, status, detail)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
           SET label = EXCLUDED.label,
               kind  = EXCLUDED.kind,
               status = EXCLUDED.status,
               detail = EXCLUDED.detail,
               updated_at = NOW()`,
        [id, label, kind, 16, status || 'ACTIVE', detail || `Custom ${kind} entity`],
      );

      // Create relationship if parentId provided
      if (parentId) {
        const resolvedRelType = (relType || (kind === 'pillar' ? 'COMMANDS' : 'USES')).toUpperCase();
        await pool.query(
          `INSERT INTO edges (source_id, target_id, rel_type)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [parentId, id, resolvedRelType],
        );
      }

      return NextResponse.json({ success: true, source: 'postgres' });
    } catch (pgErr: any) {
      console.error('[graph-api/create] Postgres write error:', pgErr);
      return NextResponse.json({ error: pgErr.message || 'Database write failed' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
