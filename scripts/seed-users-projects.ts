/**
 * Seed Users and Projects in Neo4j Aura
 *
 * Populates:
 * - 3 User entities: Shankar, Rasappa, Rajesh
 * - 1-to-1 Project entities with [name, deadline, description, status]
 * - [:OWNS_PROJECT] relationships linking User -> Project
 * - [:MANAGES_TOPOLOGY] relationships linking Project -> Sentinel Core Root
 *
 * Usage: npx tsx scripts/seed-users-projects.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { runQuery, isNeo4jConfigured } from '../lib/neo4j';

async function seedUsersAndProjects() {
  console.log('🚀 Seeding Users (Shankar, Rasappa, Rajesh) & Projects in Neo4j Aura...');

  if (!isNeo4jConfigured()) {
    console.error('❌ Neo4j not configured in .env.local');
    process.exit(1);
  }

  try {
    // 1. Clear existing User and Project nodes
    await runQuery(`MATCH (u:User) DETACH DELETE u`);
    await runQuery(`MATCH (p:Project) DETACH DELETE p`);
    console.log('🧹 Purged existing User and Project nodes.');

    // 2. Create Users
    const users = [
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
        },
      },
    ];

    for (const u of users) {
      await runQuery(
        `CREATE (u:User {
           id: $id,
           name: $name,
           email: $email,
           role: $role,
           createdAt: $createdAt
         })
         CREATE (p:Project {
           id: $pId,
           name: $pName,
           deadline: $pDeadline,
           description: $pDescription,
           status: $pStatus,
           createdAt: $createdAt,
           userId: $id
         })
         CREATE (u)-[:OWNS_PROJECT]->(p)
         WITH p
         OPTIONAL MATCH (c:Entity {id: 'core-sentinel'})
         FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
           CREATE (p)-[:MANAGES_TOPOLOGY]->(c)
         )`,
        {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          pId: u.project.id,
          pName: u.project.name,
          pDeadline: u.project.deadline,
          pDescription: u.project.description,
          pStatus: u.project.status,
        }
      );
      console.log(`  ✓ Created User "${u.name}" -> Project "${u.project.name}" (Deadline: ${u.project.deadline})`);
    }

    // Verify
    const countCheck = await runQuery<{ userCount: number; projCount: number; relCount: number }>(
      `MATCH (u:User)
       MATCH (p:Project)
       MATCH (u)-[r:OWNS_PROJECT]->(p)
       RETURN count(DISTINCT u) AS userCount, count(DISTINCT p) AS projCount, count(r) AS relCount`
    );

    console.log('\n🎉 User & Project Seed Completed Successfully!');
    console.log(`📊 Users in Neo4j Aura: ${countCheck[0]?.userCount}`);
    console.log(`📊 Projects in Neo4j Aura: ${countCheck[0]?.projCount}`);
    console.log(`📊 [:OWNS_PROJECT] Relations: ${countCheck[0]?.relCount}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedUsersAndProjects();
