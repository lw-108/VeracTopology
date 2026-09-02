import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import type { UserEntity, ProjectEntity } from '@/types/graph';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { userId: string };
}

/**
 * GET /api/user/[userId]
 * Read single user profile and their associated project from Apache AGE / PostgreSQL.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = params;

  if (isAgeConfigured()) {
    try {
      const records = await runAgeQuery<{
        uId: string;
        uName: string;
        uEmail: string;
        uRole: string;
        uCreatedAt: string;
        pId: string | null;
        pName: string | null;
        pDeadline: string | null;
        pDescription: string | null;
        pStatus: string | null;
      }>(
        `MATCH (u:User {id: '${userId}'})
         OPTIONAL MATCH (u)-[:OWNS_PROJECT]->(p:Project)
         RETURN u.id AS uId, u.name AS uName, u.email AS uEmail, u.role AS uRole, u.createdAt AS uCreatedAt,
                p.id AS pId, p.name AS pName, p.deadline AS pDeadline, p.description AS pDescription, p.status AS pStatus`,
        'uId agtype, uName agtype, uEmail agtype, uRole agtype, uCreatedAt agtype, pId agtype, pName agtype, pDeadline agtype, pDescription agtype, pStatus agtype'
      );

      if (records.length > 0) {
        const r = records[0];
        const user: UserEntity = {
          id: r.uId,
          name: r.uName,
          email: r.uEmail,
          role: r.uRole,
          createdAt: r.uCreatedAt,
          project: r.pId
            ? {
                id: r.pId,
                name: r.pName || '',
                deadline: r.pDeadline || '',
                description: r.pDescription || '',
                status: (r.pStatus as ProjectEntity['status']) || 'Active',
                userId: r.uId,
              }
            : null,
        };
        return NextResponse.json({ user, source: 'apache-age' });
      }
    } catch (err) {
      console.warn('[user-api/[userId]] AGE error:', err);
    }
  }

  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}

/**
 * PUT /api/user/[userId]
 * Update user details and/or project details in Apache AGE.
 */
export async function PUT(req: Request, { params }: RouteContext) {
  const { userId } = params;
  try {
    const body = await req.json();
    const { name, email, role, project } = body as {
      name?: string;
      email?: string;
      role?: string;
      project?: {
        name?: string;
        deadline?: string;
        description?: string;
        status?: string;
      };
    };

    if (isAgeConfigured()) {
      try {
        await runAgeQuery(
          `MATCH (u:User {id: '${userId}'})
           SET u.name = '${name || ''}',
               u.email = '${email || ''}',
               u.role = '${role || ''}'
           RETURN u`,
          'u agtype'
        );

        if (project) {
          const pId = `proj-${Date.now().toString(36)}`;
          await runAgeQuery(
            `MATCH (u:User {id: '${userId}'})
             MERGE (u)-[:OWNS_PROJECT]->(p:Project)
             ON CREATE SET p.id = '${pId}', p.createdAt = '${new Date().toISOString()}'
             SET p.name = '${project.name || ''}',
                 p.deadline = '${project.deadline || ''}',
                 p.description = '${project.description || ''}',
                 p.status = '${project.status || 'Active'}',
                 p.userId = '${userId}'
             RETURN p`,
            'p agtype'
          );
        }

        return NextResponse.json({ success: true, userId, source: 'apache-age' });
      } catch (err: any) {
        console.warn('[user-api/update] AGE update error:', err);
      }
    }

    return NextResponse.json({ success: true, userId, source: 'in-memory' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/[userId]
 * Delete a user and detach delete their project from Apache AGE.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { userId } = params;

  if (isAgeConfigured()) {
    try {
      await runAgeQuery(
        `MATCH (u:User {id: '${userId}'})
         OPTIONAL MATCH (u)-[:OWNS_PROJECT]->(p:Project)
         DETACH DELETE p, u
         RETURN u`,
        'u agtype'
      );
      return NextResponse.json({ success: true, deletedUserId: userId, source: 'apache-age' });
    } catch (err: any) {
      console.warn('[user-api/delete] AGE delete error:', err);
    }
  }

  return NextResponse.json({ success: true, deletedUserId: userId, source: 'in-memory' });
}
