import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import type { UserEntity, ProjectEntity } from '@/types/graph';

export const dynamic = 'force-dynamic';

// Fallback in-memory store
let mockUsers: UserEntity[] = [
  {
    id: 'usr-shankar',
    name: 'Shankar',
    email: 'shankar@sentinel.sec',
    role: 'Lead Security Architect',
    createdAt: '2026-01-15T08:00:00Z',
    project: {
      id: 'proj-grid-sentinel',
      name: 'Grid Sentinel 2026',
      deadline: '2026-11-30',
      description: 'Zero-trust OT/SCADA & smart building threat isolation mesh across 14 manufacturing plants.',
      status: 'Active',
      userId: 'usr-shankar',
      topologyRootId: 'core-sentinel',
    },
  },
  {
    id: 'usr-rasappa',
    name: 'Rasappa',
    email: 'rasappa@sentinel.sec',
    role: 'Autonomous Agent Director',
    createdAt: '2026-02-01T09:30:00Z',
    project: {
      id: 'proj-v2x-guard',
      name: 'Automotive V2X Guard',
      deadline: '2026-12-15',
      description: 'Fleet-wide CAN bus anomaly detection and automated PKI quarantine enforcement for connected vehicles.',
      status: 'In Review',
      userId: 'usr-rasappa',
      topologyRootId: 'core-sentinel',
    },
  },
  {
    id: 'usr-rajesh',
    name: 'Rajesh',
    email: 'rajesh@sentinel.sec',
    role: 'IoMT Compliance Director',
    createdAt: '2026-03-10T11:00:00Z',
    project: {
      id: 'proj-iomt-shield',
      name: 'IoMT Medical Telemetry Shield',
      deadline: '2027-01-20',
      description: 'Hospital device micro-segmentation and HL7/FHIR telemetry tamper-detection engine.',
      status: 'Planning',
      userId: 'usr-rajesh',
      topologyRootId: 'core-sentinel',
    },
  },
];

/**
 * GET /api/user
 * List all users with their 1-to-1 associated project from Apache AGE / PostgreSQL.
 */
export async function GET() {
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
        `MATCH (u:User)
         OPTIONAL MATCH (u)-[:OWNS_PROJECT]->(p:Project)
         RETURN u.id AS uId, u.name AS uName, u.email AS uEmail, u.role AS uRole, u.createdAt AS uCreatedAt,
                p.id AS pId, p.name AS pName, p.deadline AS pDeadline, p.description AS pDescription, p.status AS pStatus
         ORDER BY u.createdAt DESC`,
        'uId agtype, uName agtype, uEmail agtype, uRole agtype, uCreatedAt agtype, pId agtype, pName agtype, pDeadline agtype, pDescription agtype, pStatus agtype'
      );

      if (records.length > 0) {
        const users: UserEntity[] = records.map((r) => ({
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
        }));
        return NextResponse.json({ users, source: 'apache-age' });
      }
    } catch (err) {
      console.warn('[user-api] AGE query failed, using fallback:', err);
    }
  }

  return NextResponse.json({ users: mockUsers, source: 'in-memory' });
}

/**
 * POST /api/user
 * Create a new user and associate their 1-to-1 project in Apache AGE.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, project } = body as {
      name: string;
      email: string;
      role: string;
      project?: {
        name: string;
        deadline: string;
        description: string;
        status?: string;
      };
    };

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const userId = `usr-${Date.now().toString(36)}`;
    const createdAt = new Date().toISOString();
    const projectId = project?.name ? `proj-${Date.now().toString(36)}` : null;

    if (isAgeConfigured()) {
      try {
        await runAgeQuery(
          `CREATE (u:User {
             id: '${userId}',
             name: '${name}',
             email: '${email}',
             role: '${role || 'Security Engineer'}',
             createdAt: '${createdAt}'
           })
           RETURN u`,
          'u agtype'
        );

        let createdProject: ProjectEntity | null = null;
        if (projectId && project) {
          await runAgeQuery(
            `MATCH (u:User {id: '${userId}'})
             CREATE (p:Project {
               id: '${projectId}',
               name: '${project.name}',
               deadline: '${project.deadline || ''}',
               description: '${project.description || ''}',
               status: '${project.status || 'Active'}',
               createdAt: '${createdAt}',
               userId: '${userId}'
             })
             CREATE (u)-[:OWNS_PROJECT]->(p)
             RETURN p`,
            'p agtype'
          );

          createdProject = {
            id: projectId,
            name: project.name,
            deadline: project.deadline || '',
            description: project.description || '',
            status: (project.status as ProjectEntity['status']) || 'Active',
            userId,
          };
        }

        const newUser: UserEntity = {
          id: userId,
          name,
          email,
          role: role || 'Security Engineer',
          createdAt,
          project: createdProject,
        };

        return NextResponse.json({ user: newUser, source: 'apache-age' }, { status: 201 });
      } catch (err: any) {
        console.warn('[user-api] AGE create failed:', err);
      }
    }

    // In-memory fallback
    const newUser: UserEntity = {
      id: userId,
      name,
      email,
      role: role || 'Security Engineer',
      createdAt,
      project: project
        ? {
            id: projectId || `proj-${Date.now().toString(36)}`,
            name: project.name,
            deadline: project.deadline,
            description: project.description,
            status: (project.status as ProjectEntity['status']) || 'Active',
            userId,
          }
        : null,
    };
    mockUsers.unshift(newUser);

    return NextResponse.json({ user: newUser, source: 'in-memory' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
