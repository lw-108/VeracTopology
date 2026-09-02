/**
 * Entity Service — Write-Through Sync Layer
 *
 * Single entry point for ALL entity/relationship writes.
 * Writes to Postgres (entities + edges tables) first,
 * then syncs to Apache AGE graph if configured.
 *
 * Server-side only.
 */

import { getPgPool } from '@/lib/pg';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import type { NodeKind } from '@/types/graph';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EntityInput {
  id: string;
  label: string;
  kind: NodeKind;
  val?: number;
  color?: string;
  status?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface RelationshipInput {
  sourceId: string;
  targetId: string;
  relType: 'COMMANDS' | 'OVERSEES' | 'USES';
}

// ── Relationship type inference ────────────────────────────────────────────────

/**
 * Infer the relationship type from source and target node kinds.
 */
export function inferRelType(sourceKind: NodeKind, targetKind: NodeKind): 'COMMANDS' | 'OVERSEES' | 'USES' {
  if (sourceKind === 'core' && targetKind === 'pillar') return 'COMMANDS';
  if (sourceKind === 'pillar' && ['agent', 'task', 'human'].includes(targetKind)) return 'OVERSEES';
  if (['agent', 'task', 'human'].includes(sourceKind) && targetKind === 'tool') return 'USES';
  return 'USES';
}

// ── Create Entity ──────────────────────────────────────────────────────────────

/**
 * Create a new entity. Writes to Postgres first, then MERGEs into Apache AGE.
 */
export async function createEntity(entity: EntityInput): Promise<{ success: boolean; error?: string }> {
  const pool = getPgPool();

  // 1. Write to Postgres (source of truth)
  try {
    await pool.query(
      `INSERT INTO entities (id, label, kind, val, color, status, detail, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE
         SET label = EXCLUDED.label,
             kind  = EXCLUDED.kind,
             val   = EXCLUDED.val,
             color = EXCLUDED.color,
             status = EXCLUDED.status,
             detail = EXCLUDED.detail,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()`,
      [
        entity.id,
        entity.label,
        entity.kind,
        entity.val ?? 10,
        entity.color ?? null,
        entity.status ?? null,
        entity.detail ?? null,
        JSON.stringify(entity.metadata ?? {}),
      ],
    );
  } catch (pgError: any) {
    return { success: false, error: `[entityService] Postgres insert failed: ${pgError.message}` };
  }

  // 2. Sync to Apache AGE (if configured)
  if (isAgeConfigured()) {
    try {
      const cypher = `
        MERGE (n:Entity {id: '${entity.id}'})
        SET n.label = '${entity.label}',
            n.kind = '${entity.kind}',
            n.val = ${entity.val ?? 10},
            n.color = '${entity.color || ''}',
            n.status = '${entity.status || ''}',
            n.detail = '${entity.detail || ''}'
        RETURN n
      `;
      await runAgeQuery(cypher, 'n agtype');
    } catch (ageErr) {
      console.error(
        `[entityService] Apache AGE sync failed for entity ${entity.id}:`,
        ageErr instanceof Error ? ageErr.message : ageErr,
      );
    }
  }

  return { success: true };
}

// ── Create Relationship ────────────────────────────────────────────────────────

/**
 * Create a relationship between two entities.
 * Writes to the `edges` Postgres table, and syncs to Apache AGE if configured.
 */
export async function createRelationship(rel: RelationshipInput): Promise<{ success: boolean; error?: string }> {
  const pool = getPgPool();

  // 1. Write to Postgres edges table
  try {
    await pool.query(
      `INSERT INTO edges (source_id, target_id, rel_type)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [rel.sourceId, rel.targetId, rel.relType],
    );
  } catch (pgError: any) {
    return { success: false, error: `[entityService] Postgres edge insert failed: ${pgError.message}` };
  }

  // 2. Sync to Apache AGE (if configured)
  if (isAgeConfigured()) {
    try {
      const cypher = `
        MATCH (a:Entity {id: '${rel.sourceId}'}), (b:Entity {id: '${rel.targetId}'})
        CREATE (a)-[:${rel.relType}]->(b)
        RETURN a
      `;
      await runAgeQuery(cypher, 'a agtype');
    } catch (ageErr) {
      console.error(`[entityService] Apache AGE relationship sync failed:`, ageErr);
    }
  }

  return { success: true };
}

// ── Update Entity ──────────────────────────────────────────────────────────────

/**
 * Update an existing entity in Postgres and Apache AGE.
 */
export async function updateEntity(
  id: string,
  updates: Partial<Omit<EntityInput, 'id'>>,
): Promise<{ success: boolean; error?: string }> {
  const pool = getPgPool();

  try {
    await pool.query(
      `UPDATE entities
       SET label = COALESCE($1, label),
           kind  = COALESCE($2, kind),
           val   = COALESCE($3, val),
           color = COALESCE($4, color),
           status = COALESCE($5, status),
           detail = COALESCE($6, detail),
           updated_at = NOW()
       WHERE id = $7`,
      [
        updates.label ?? null,
        updates.kind ?? null,
        updates.val ?? null,
        updates.color ?? null,
        updates.status ?? null,
        updates.detail ?? null,
        id,
      ],
    );
  } catch (pgError: any) {
    return { success: false, error: `[entityService] Postgres update failed: ${pgError.message}` };
  }

  if (isAgeConfigured()) {
    try {
      const cypher = `
        MATCH (n:Entity {id: '${id}'})
        SET n.label = '${updates.label || ''}',
            n.kind = '${updates.kind || 'agent'}',
            n.status = '${updates.status || ''}',
            n.detail = '${updates.detail || ''}',
            n.color = '${updates.color || ''}'
        RETURN n
      `;
      await runAgeQuery(cypher, 'n agtype');
    } catch (ageErr) {
      console.error(`[entityService] Apache AGE update failed for ${id}:`, ageErr);
    }
  }

  return { success: true };
}

// ── Delete Entity ──────────────────────────────────────────────────────────────

/**
 * Delete an entity from Postgres (cascade deletes edges) and Apache AGE.
 */
export async function deleteEntity(id: string): Promise<{ success: boolean; error?: string }> {
  const pool = getPgPool();

  try {
    await pool.query(`DELETE FROM entities WHERE id = $1`, [id]);
  } catch (pgError: any) {
    return { success: false, error: `[entityService] Postgres delete failed: ${pgError.message}` };
  }

  if (isAgeConfigured()) {
    try {
      const cypher = `MATCH (n:Entity {id: '${id}'}) DETACH DELETE n`;
      await runAgeQuery(cypher, 'n agtype');
    } catch (ageErr) {
      console.error(`[entityService] Apache AGE delete failed for ${id}:`, ageErr);
    }
  }

  return { success: true };
}

// ── Bulk Seed Helpers ──────────────────────────────────────────────────────────

/**
 * Bulk upsert entities into Postgres. Used by the seed script.
 */
export async function bulkUpsertEntities(entities: EntityInput[]): Promise<{ success: boolean; error?: string }> {
  const pool = getPgPool();

  for (const entity of entities) {
    try {
      await pool.query(
        `INSERT INTO entities (id, label, kind, val, color, status, detail, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE
           SET label = EXCLUDED.label,
               kind  = EXCLUDED.kind,
               val   = EXCLUDED.val,
               color = EXCLUDED.color,
               status = EXCLUDED.status,
               detail = EXCLUDED.detail,
               metadata = EXCLUDED.metadata,
               updated_at = NOW()`,
        [
          entity.id,
          entity.label,
          entity.kind,
          entity.val ?? 10,
          entity.color ?? null,
          entity.status ?? null,
          entity.detail ?? null,
          JSON.stringify(entity.metadata ?? {}),
        ],
      );
    } catch (pgError: any) {
      return { success: false, error: `[entityService] Bulk upsert failed for ${entity.id}: ${pgError.message}` };
    }
  }

  return { success: true };
}
