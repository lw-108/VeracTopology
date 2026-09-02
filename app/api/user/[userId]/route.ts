import { NextResponse } from 'next/server';
import { isNeo4jConfigured, runQuery } from '@/lib/neo4j';
import type { UserEntity, ProjectEntity } from '@/types/graph';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { userId: string };
}

/**
 * GET /api/user/[userId]
 * Read single user profile and their associated project from Neo4j.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = params;

  if (isNeo4jConfigured()) {
    try {
      const records = await runQuery<{
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
        `MATCH (u:User {id: $userId})
         OPTIONAL MATCH (u)-[:OWNS_PROJECT]->(p:Project)
         RETURN u.id AS uId, u.name AS uName, u.email AS uEmail, u.role AS uRole, u.createdAt AS uCreatedAt,
                p.id AS pId, p.name AS pName, p.deadline AS pDeadline, p.description AS pDescription, p.status AS pStatus`,
        { userId }
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
        return NextResponse.json({ user, source: 'neo4j' });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    } catch (err) {
      console.warn('[user-api/[userId]] Neo4j error:', err);
    }
  }

  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}

/**
 * PUT /api/user/[userId]
 * Update user details and/or project details in Neo4j.
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

    if (isNeo4jConfigured()) {
      try {
        // Update user properties
        await runQuery(
          `MATCH (u:User {id: $userId})
           SET u.name = coalesce($name, u.name),
               u.email = coalesce($email, u.email),
               u.role = coalesce($role, u.role)`,
          {
            userId,
            name: name || null,
            email: email || null,
            role: role || null,
          }
        );

        // Update or create project if requested
        if (project) {
          await runQuery(
            `MATCH (u:User {id: $userId})
             MERGE (u)-[:OWNS_PROJECT]->(p:Project)
             ON CREATE SET p.id = $pId, p.createdAt = datetime()
             SET p.name = coalesce($pName, p.name),
                 p.deadline = coalesce($pDeadline, p.deadline),
                 p.description = coalesce($pDescription, p.description),
                 p.status = coalesce($pStatus, p.status),
                 p.userId = $userId`,
            {
              userId,
              pId: `proj-${Date.now().toString(36)}`,
              pName: project.name || null,
              pDeadline: project.deadline || null,
              pDescription: project.description || null,
              pStatus: project.status || null,
            }
          );
        }

        return NextResponse.json({ success: true, userId, source: 'neo4j' });
      } catch (err: any) {
        console.error('[user-api/update] Neo4j update error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, userId, source: 'in-memory' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/[userId]
 * Delete a user and detach delete their project from Neo4j.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { userId } = params;

  if (isNeo4jConfigured()) {
    try {
      await runQuery(
        `MATCH (u:User {id: $userId})
         OPTIONAL MATCH (u)-[:OWNS_PROJECT]->(p:Project)
         DETACH DELETE p, u`,
        { userId }
      );
      return NextResponse.json({ success: true, deletedUserId: userId, source: 'neo4j' });
    } catch (err: any) {
      console.error('[user-api/delete] Neo4j delete error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, deletedUserId: userId, source: 'in-memory' });
}
