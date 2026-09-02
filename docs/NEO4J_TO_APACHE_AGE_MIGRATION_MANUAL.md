# Engineering Runbook & Manual: Neo4j to PostgreSQL (Apache AGE) Migration

**Project:** IoT Cyber Security Mesh & Threat Topology (GraphOS / VeracTopology)  
**Document Type:** Standard Operating Procedure (SOP) & Technical Manual  
**Prepared For:** Engineering Team, Tech Lead & Senior Leadership  
**Status:** Approved for Implementation  

---

## 1. Context & Business Rationale

### 1.1 Why We Are Migrating to PostgreSQL (Apache AGE)
1. **Infrastructure Consolidation (Single Database Stack):**  
   Our application already uses PostgreSQL as the source of truth for the `entities` table and structured telemetry. Running Neo4j alongside PostgreSQL requires maintaining two database instances, two backup schedules, two authentication schemes, and two networking bridges. Apache AGE embeds graph capabilities directly into PostgreSQL.

2. **Cost & Operational Simplicity:**  
   Eliminating a separate Neo4j instance reduces hosting and cloud licensing costs (especially compared to Neo4j Aura/Enterprise), memory consumption, and DevOps complexity.

3. **Unified Relational + Graph Queries (Hybrid Access):**  
   With Apache AGE, we can query nodes/edges using Cypher and join them directly with relational tables (logs, audits, user access) using standard SQL in a single query transaction without complex application-layer joins.

4. **Preserving Graph Flexibility (Future Road to Neo4j):**  
   Apache AGE implements the **OpenCypher** standard. Our graph queries (`MATCH`, `CREATE`, `MERGE`, `WHERE`, `RETURN`) remain nearly identical. If GraphOS later grows to massive clustering scales where a dedicated graph engine like Neo4j is required, we can switch back with minimal code changes.

---

## 2. Prerequisites & Environment Setup

Before starting the migration, ensure the following requirements are met:

### System & Tool Requirements
- **PostgreSQL Server:** Version 12, 13, 14, 15, or 16 (Self-hosted, Docker, or Cloud VM).
- **Apache AGE Extension:** Installed on the PostgreSQL instance.
- **Node.js Environment:** Version `>= 18` with `pg` / `node-postgres` driver installed.
- **Existing Neo4j Access:** Credentials to the current Neo4j instance to export existing graph relationships (if any).

---

## 3. Step-by-Step Migration Manual

```
                    ┌───────────────────────────────┐
                    │    1. INSTALL & CONFIGURE     │
                    │   PostgreSQL + Apache AGE     │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     2. INITIALIZE GRAPH       │
                    │     ag_catalog & graphos      │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  3. CONVERT DRIVER & CONFIG   │
                    │  neo4j-driver  ──>  pg (AGE)  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     4. MIGRATE & SEED DATA    │
                    │   Nodes (Vertices) & Edges    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     5. UPDATE APP QUERIES     │
                    │  Next.js API & UI Canvas D3   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   6. VERIFICATION & TESTING   │
                    └───────────────────────────────┘
```

---

### Step 1: Install & Configure Apache AGE in PostgreSQL

#### Option A: Using Docker (Recommended for Local Dev & Testing)
Run the official Apache AGE container:
```bash
docker run --name graphos-age -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=graphos_db \
  -d apache/age:latest
```

#### Option B: On Existing PostgreSQL Instance
If building/installing manually:
```bash
# Add to postgresql.conf
shared_preload_libraries = 'age'
```
Restart PostgreSQL service.

---

### Step 2: Initialize Apache AGE Extension and Graph in PostgreSQL

Connect to your database via `psql` or database GUI (DBeaver/pgAdmin) and execute:

```sql
-- 1. Enable AGE Extension
CREATE EXTENSION IF NOT EXISTS age;

-- 2. Load AGE into current session
LOAD 'age';

-- 3. Set the search path so ag_catalog functions and types are visible
SET search_path = ag_catalog, "$user", public;

-- 4. Create the GraphOS topology graph namespace
SELECT create_graph('graphos');

-- 5. (Optional) Verify creation
SELECT * FROM ag_graph;
```

---

### Step 3: Create the Database Connection Helper in GraphOS (`lib/age.ts`)

Replace the Neo4j singleton driver with a PostgreSQL AGE query executor.

**Create File: `lib/age.ts`**
```typescript
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Executes an OpenCypher query inside PostgreSQL Apache AGE.
 * 
 * @param cypher - Cypher query string
 * @param returns - Column return definition for AGE (e.g. 'v agtype' or 'n agtype, r agtype, m agtype')
 */
export async function runAgeQuery<T = any>(
  cypher: string,
  returns: string = 'v agtype'
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    // Required AGE session setup
    await client.query(`LOAD 'age';`);
    await client.query(`SET search_path = ag_catalog, "$user", public;`);

    const sql = `SELECT * FROM cypher('graphos', $$ ${cypher} $$) as (${returns});`;
    const res = await client.query(sql);

    return res.rows.map((row: Record<string, any>) => {
      // If single column returned, return that value; otherwise return full row object
      const keys = Object.keys(row);
      return keys.length === 1 ? row[keys[0]] : row;
    });
  } finally {
    client.release();
  }
}
```

---

### Step 4: Update Environment Configuration (`.env.local`)

Update `.env.local` to point to your PostgreSQL instance:

```env
# PostgreSQL with Apache AGE Connection
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/graphos_db"

# Legacy Neo4j (Retained for future reference if needed)
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=password
```

---

### Step 5: Data Migration & Seeding Script (`scripts/seed-age.ts`)

Convert the Neo4j seeding logic into Apache AGE cypher operations.

**Create File: `scripts/seed-age.ts`**
```typescript
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runAgeQuery } from '../lib/age';

// 1. Entities Definition
const nodes = [
  { id: 'core', label: 'SOC CORE', kind: 'core', val: 24, status: 'ARMED / ONLINE', detail: 'Central IoT Threat Command Kernel.' },
  { id: 'industrial-ot', label: 'INDUSTRIAL OT', kind: 'pillar', val: 15, color: '#e11d48', status: 'PROTECTED', detail: 'Operational Technology & SCADA defense layer.' },
  { id: 'smart-bldg', label: 'SMART BUILDINGS', kind: 'pillar', val: 15, color: '#d97706', status: 'MONITORED', detail: 'Building Management System security.' },
  { id: 'net-edge', label: 'NETWORK EDGE', kind: 'pillar', val: 15, color: '#7c3aed', status: 'ACTIVE DEFENSE', detail: '5G Gateway & Network Edge perimeter.' },
  { id: 'health-iomt', label: 'CONNECTED HEALTH', kind: 'pillar', val: 15, color: '#059669', status: 'HIPAA ENCRYPTED', detail: 'IoMT medical device security.' },
  { id: 'automotive-v2x', label: 'AUTOMOTIVE V2X', kind: 'pillar', val: 15, color: '#0284c7', status: 'CAN SHIELD LIVE', detail: 'V2X telematics and CAN bus security.' },
  { id: 'anomaly-ai', label: 'ANOMALY AI', kind: 'agent', val: 9, status: 'SCANNING', detail: 'Inspects OT packet flows for anomalies.' },
  { id: 'plc-audit', label: 'PLC AUDIT', kind: 'task', val: 8, status: 'RUNNING', detail: 'Validates ladder-logic checksums.' },
  { id: 'suricata', label: 'SURICATA', kind: 'tool', val: 6, status: 'LINKED', detail: 'Network threat detection engine.' }
];

const links = [
  { source: 'core', target: 'industrial-ot', type: 'COMMANDS' },
  { source: 'core', target: 'smart-bldg', type: 'COMMANDS' },
  { source: 'core', target: 'net-edge', type: 'COMMANDS' },
  { source: 'industrial-ot', target: 'anomaly-ai', type: 'OVERSEES' },
  { source: 'industrial-ot', target: 'plc-audit', type: 'OVERSEES' },
  { source: 'anomaly-ai', target: 'suricata', type: 'USES' }
];

async function seedAge() {
  console.log('🚀 Starting Apache AGE Data Migration...');

  // A. Create Vertices (Nodes)
  for (const node of nodes) {
    const cypher = `
      MERGE (n:Entity {id: '${node.id}'})
      SET n.label = '${node.label}',
          n.kind = '${node.kind}',
          n.val = ${node.val},
          n.status = '${node.status || ''}',
          n.detail = '${node.detail || ''}'
      RETURN n
    `;
    await runAgeQuery(cypher, 'n agtype');
    console.log(`  ✓ Vertex created/merged: ${node.id}`);
  }

  // B. Create Edges (Relationships)
  for (const link of links) {
    const cypher = `
      MATCH (a:Entity {id: '${link.source}'}), (b:Entity {id: '${link.target}'})
      CREATE (a)-[:${link.type}]->(b)
      RETURN a
    `;
    await runAgeQuery(cypher, 'a agtype');
    console.log(`  ✓ Edge created: (${link.source}) -[${link.type}]-> (${link.target})`);
  }

  console.log('🎉 Apache AGE Seeding Complete!');
  process.exit(0);
}

seedAge().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
```

Execute migration via terminal:
```bash
npx tsx scripts/seed-age.ts
```

---

### Step 6: Application Querying for D3 Canvas Visualization

Update the API route returning graph data to the frontend:

```typescript
// app/api/topology/route.ts
import { NextResponse } from 'next/server';
import { runAgeQuery } from '@/lib/age';

export async function GET() {
  try {
    // Retrieve all nodes and directed relationships
    const cypher = `
      MATCH (a:Entity)-[r]->(b:Entity)
      RETURN a, r, b
    `;
    const results = await runAgeQuery(cypher, 'a agtype, r agtype, b agtype');

    // Format for D3 force-directed canvas
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

## 4. Verification & Testing Checklist

| Step | Verification Task | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **1** | Verify AGE Extension | `SELECT * FROM pg_extension WHERE extname = 'age';` returns 1 row | [ ] Verified |
| **2** | Verify Graph Namespace | `SELECT * FROM ag_graph WHERE name = 'graphos';` returns 1 row | [ ] Verified |
| **3** | Vertex Count Check | `SELECT * FROM cypher('graphos', $$ MATCH (n:Entity) RETURN count(n) $$) as (c agtype);` matches total nodes | [ ] Verified |
| **4** | Relationship Count | `SELECT * FROM cypher('graphos', $$ MATCH ()-[r]->() RETURN count(r) $$) as (c agtype);` matches total edges | [ ] Verified |
| **5** | Visual Canvas Check | GraphOS Web UI renders SOC CORE, Pillars, and orbital child links correctly | [ ] Verified |

---

## 5. Future Plan: If Neo4j Becomes Necessary

If future scaling demands dedicated distributed graph clustering (e.g. billions of relationships or deep 10+ hop graph algorithms):

1. **Standardized Cypher:** All queries written for Apache AGE comply with OpenCypher standards and will run directly on Neo4j without syntactic rewrites.
2. **Export to Neo4j:** Graph data can be exported using standard PostgreSQL CSV dump or Apache AGE graph export scripts directly into Neo4j's `admin-import` tool.
3. **Driver Toggle:** Switching requires only re-pointing the graph client from `lib/age.ts` to `lib/neo4j.ts`.
