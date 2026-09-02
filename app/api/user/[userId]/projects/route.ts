import { NextResponse } from 'next/server';
import { isNeo4jConfigured, runQuery } from '@/lib/neo4j';
import type { ProjectEntity } from '@/types/graph';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { userId: string };
}

/**
 * GET /api/user/[userId]/projects
 * Queries Neo4j for the project list belonging to a specific User ID.
 * Returns project details: [name, deadline, description, status, id, userId].
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = params;

  if (isNeo4jConfigured()) {
    try {
      const records = await runQuery<{
        id: string;
        name: string;
        deadline: string;
        description: string;
        status: string;
        createdAt: string;
        userId: string;
      }>(
        `MATCH (u:User {id: $userId})-[:OWNS_PROJECT]->(p:Project)
         RETURN p.id AS id, p.name AS name, p.deadline AS deadline,
                p.description AS description, p.status AS status,
                p.createdAt AS createdAt, u.id AS userId
         ORDER BY p.createdAt DESC`,
        { userId }
      );

      const projects: ProjectEntity[] = records.map((r) => ({
        id: r.id,
        name: r.name || '',
        deadline: r.deadline || '',
        description: r.description || '',
        status: (r.status as ProjectEntity['status']) || 'Active',
        userId: r.userId,
        createdAt: r.createdAt,
      }));

      return NextResponse.json({
        userId,
        count: projects.length,
        projects,
        source: 'neo4j',
      });
    } catch (err: any) {
      console.error('[user-projects-api] Neo4j query error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Fallback if Neo4j is offline
  return NextResponse.json({
    userId,
    count: 1,
    projects: [
      {
        id: 'proj-01',
        name: 'Grid Sentinel 2026',
        deadline: '2026-11-30',
        description: 'Zero-trust OT/SCADA & smart building threat isolation mesh across 14 manufacturing plants.',
        status: 'Active',
        userId,
      },
    ],
    source: 'in-memory',
  });
}
