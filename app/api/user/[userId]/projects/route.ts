import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import type { ProjectEntity } from '@/types/graph';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { userId: string };
}

/**
 * GET /api/user/[userId]/projects
 * Queries Apache AGE / Postgres for the project list belonging to a specific User ID.
 * Returns project details: [name, deadline, description, status, id, userId].
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = params;

  if (isAgeConfigured()) {
    try {
      const records = await runAgeQuery<{
        id: string;
        name: string;
        deadline: string;
        description: string;
        status: string;
        createdAt: string;
        userId: string;
      }>(
        `MATCH (u:User {id: '${userId}'})-[:OWNS_PROJECT]->(p:Project)
         RETURN p.id AS id, p.name AS name, p.deadline AS deadline,
                p.description AS description, p.status AS status,
                p.createdAt AS createdAt, u.id AS userId`,
        'id agtype, name agtype, deadline agtype, description agtype, status agtype, createdAt agtype, userId agtype'
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

      if (projects.length > 0) {
        return NextResponse.json({
          userId,
          count: projects.length,
          projects,
          source: 'apache-age',
        });
      }
    } catch (err: any) {
      console.warn('[user-projects-api] AGE query error, falling back to mock:', err?.message || err);
    }
  }

  // Fallback if DB is offline or empty
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
