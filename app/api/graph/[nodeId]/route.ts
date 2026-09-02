/**
 * GET /api/graph/[nodeId]
 *
 * Neighborhood read API — queries PostgreSQL Apache AGE for a node's direct neighbors.
 */

import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import { DEFAULT_NODES, DEFAULT_EDGES } from '@/lib/default-topology';
import type { EntityData, GraphEdge } from '@/types/graph';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: { nodeId: string } },
) {
  const { nodeId } = params;
  const isDev = process.env.NODE_ENV === 'development';

  // 1. Primary: PostgreSQL Apache AGE
  if (isAgeConfigured()) {
    const ageStart = performance.now();
    try {
      const records = await runAgeQuery<any>(
        `MATCH (n:Entity {id: '${nodeId}'})-[r]-(m:Entity)
         RETURN n.id, m.id, type(r), n, m
         LIMIT 200`,
        `source agtype, target agtype, relType agtype, sourceNode agtype, targetNode agtype`
      );

      const ageMs = performance.now() - ageStart;
      const idSet = new Set<string>([nodeId]);
      const edges: GraphEdge[] = [];
      const entityMap = new Map<string, EntityData>();

      for (const row of records) {
        idSet.add(row.source);
        idSet.add(row.target);
        edges.push({
          source: row.source,
          target: row.target,
          relType: row.relType,
        });

        for (const rawNode of [row.sourceNode, row.targetNode]) {
          const props = rawNode?.properties || rawNode;
          if (props && props.id) {
            const id = props.id as string;
            if (!entityMap.has(id)) {
              entityMap.set(id, {
                id,
                label: (props.label as string) || id.toUpperCase(),
                kind: ((props.kind as string) || 'agent') as EntityData['kind'],
                val: (props.val as number) || 10,
                color: (props.color as string) || undefined,
                status: (props.status as string) || undefined,
                detail: (props.detail as string) || undefined,
              });
            }
          }
        }
      }

      const nodes = [...idSet]
        .map((id) => entityMap.get(id))
        .filter((e): e is EntityData => e !== undefined);

      if (isDev) {
        console.log(`[graph-api] Apache AGE: ${ageMs.toFixed(1)}ms | Nodes: ${nodes.length} | Edges: ${edges.length}`);
      }

      if (nodes.length > 0) {
        return NextResponse.json({ nodes, edges, source: 'live-apache-age' });
      }
    } catch (err) {
      if (isDev) console.warn('[graph-api] Apache AGE node query failed, using fallback:', err);
    }
  }

  // 2. Fallback: filter from default topology
  const matchingEdges = DEFAULT_EDGES.filter((e) => e.source === nodeId || e.target === nodeId);
  const neighborIds = new Set<string>([nodeId, ...matchingEdges.map((e) => e.source), ...matchingEdges.map((e) => e.target)]);
  const matchingNodes = DEFAULT_NODES.filter((n) => neighborIds.has(n.id));

  return NextResponse.json({
    nodes: matchingNodes,
    edges: matchingEdges,
    source: 'fallback-neighborhood',
  });
}

/**
 * PUT /api/graph/[nodeId]
 * Update node contents (label, kind, status, detail, color) in Apache AGE.
 */
export async function PUT(
  request: Request,
  { params }: { params: { nodeId: string } }
) {
  const { nodeId } = params;
  try {
    const body = await request.json();
    const { label, kind, status, detail, color, val } = body as {
      label?: string;
      kind?: string;
      status?: string;
      detail?: string;
      color?: string;
      val?: number;
    };

    if (isAgeConfigured()) {
      try {
        const cypher = `
          MATCH (n:Entity {id: '${nodeId}'})
          SET n.label = '${label || ''}',
              n.kind = '${kind || 'agent'}',
              n.status = '${status || ''}',
              n.detail = '${detail || ''}',
              n.color = '${color || ''}',
              n.val = ${val || 10}
          RETURN n
        `;
        await runAgeQuery(cypher, 'n agtype');
        return NextResponse.json({ success: true, nodeId, source: 'apache-age' });
      } catch (ageErr: any) {
        console.warn('[graph-api/node/update] Apache AGE update failed:', ageErr);
      }
    }

    return NextResponse.json({ success: true, nodeId, source: 'in-memory' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/graph/[nodeId]
 * Detach delete an entity node and its relationships from Apache AGE.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { nodeId: string } }
) {
  const { nodeId } = params;

  if (isAgeConfigured()) {
    try {
      const cypher = `
        MATCH (n:Entity {id: '${nodeId}'})
        DETACH DELETE n
      `;
      await runAgeQuery(cypher, 'n agtype');
      return NextResponse.json({ success: true, deletedNodeId: nodeId, source: 'apache-age' });
    } catch (ageErr: any) {
      console.warn('[graph-api/node/delete] Apache AGE delete failed:', ageErr);
    }
  }

  return NextResponse.json({ success: true, deletedNodeId: nodeId, source: 'in-memory' });
}
