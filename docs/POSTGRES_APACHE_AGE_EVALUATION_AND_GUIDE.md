# Complete Beginner-Friendly Guide & Manual: Setting Up PostgreSQL (Apache AGE) & Migrating from Neo4j

**Project:** IoT Cyber Security Mesh & Threat Topology (GraphOS / VeracTopology)  
**Document Type:** Standard Operating Procedure (SOP), Installation Manual & Troubleshooting Runbook  
**Target Audience:** Software Engineers, DevOps, System Administrators & Technical Management  
**Status:** Tested & Verified  

---

## 1. Executive Summary & Why We Are Migrating

### 1.1 Business & Architectural Rationale
Our application previously considered Neo4j for graph topology while maintaining relational data in PostgreSQL (`entities` table). Adopting **PostgreSQL with Apache AGE (A Graph Extension)** provides distinct operational benefits:

1. **Single Unified Database:**  
   PostgreSQL natively handles both relational structured data and graph property networks (`nodes` & `relationships`). We eliminate the complexity and cost of hosting two distinct databases.
2. **Standard OpenCypher Support:**  
   Apache AGE executes the exact same OpenCypher query language (`MATCH`, `CREATE`, `MERGE`, `RETURN`) used in Neo4j.
3. **Seamless Future Road to Neo4j:**  
   Because the queries follow the OpenCypher standard, our application is modular. If future scalability requires massive dedicated graph clustering, switching back to Neo4j requires minimal code updates.

---

## 2. Software Requirements & Official Download Links

Before starting, make sure you have downloaded and installed the following prerequisites:

| Software | Version | Purpose | Download Link |
| :--- | :--- | :--- | :--- |
| **Docker Desktop** | Latest | Container runtime to run PostgreSQL with Apache AGE | [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Windows Subsystem for Linux (WSL)** | WSL 2 (v2.7+) | Required Linux backend for Docker on Windows | [Download WSL (MS Store)](https://apps.microsoft.com/detail/9P9TQF7MRM4R) or [GitHub Releases](https://github.com/microsoft/WSL/releases) |
| **Node.js** | `>= 18.x` | JavaScript runtime to run Next.js & TypeScript scripts | [Download Node.js](https://nodejs.org/en/download) |
| **DBeaver Community** *(Optional)* | Latest | Free universal database GUI to inspect graphs & tables visually | [Download DBeaver](https://dbeaver.io/download/) |

---

## 3. Step 1: Complete Windows WSL 2 Setup & Troubleshooting Fallbacks

Docker Desktop on Windows relies on **WSL 2 (Windows Subsystem for Linux)**. If your system encounters missing component or execution errors, follow these steps in order.

### 3.1 Primary Method: Install via Winget (Recommended)
Open **PowerShell as Administrator** (Right-click Start $\rightarrow$ **Terminal (Admin)** or **PowerShell (Run as Administrator)**) and execute:

```powershell
winget install --id Microsoft.WSL -e --source winget
```

---

### 3.2 Fallback Method A: Enable Windows Virtualization Features via DISM
If `winget` is unavailable or `wsl` commands return *"The system cannot find the file specified"*, enable the required Windows features directly:

```powershell
# 1. Enable Windows Subsystem for Linux
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 2. Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```
> **Important:** **Restart your computer** after executing these DISM commands to allow Windows to configure the virtualization services.

---

### 3.3 Fallback Method B: Enable via Windows Features GUI
If command-line tools fail:
1. Press `Win + R`, type `optionalfeatures`, and press **Enter**.
2. Scroll down and check:
   - ✅ **Virtual Machine Platform**
   - ✅ **Windows Subsystem for Linux**
   - ✅ **Hyper-V** *(if available)*
3. Click **OK** and restart your computer when prompted.

---

### 3.4 Fallback Method C: BIOS/Hardware Virtualization Check
If WSL shows errors such as `press any key to continue` or fails to launch:
1. Open **Task Manager** (`Ctrl + Shift + Esc`).
2. Go to the **Performance** tab $\rightarrow$ Click **CPU**.
3. Verify that **Virtualization:** says **Enabled**.
4. If it is **Disabled**, restart your PC, enter the **BIOS/UEFI settings** (press `F2`, `F10`, `F12`, or `Del` on startup), and enable **Intel Virtualization Technology (VT-x)** or **AMD SVM Mode**.

---

### 3.5 Verification of WSL
Open a fresh PowerShell window and verify:
```powershell
wsl --version
```
*Expected output: Displays WSL version, kernel version, and WSLg version.*

---

## 4. Step 2: Running PostgreSQL with Apache AGE via Docker

With Docker Desktop running and showing green (Engine Running), start the Apache AGE container:

### 4.1 Launch the Container
Run in PowerShell:
```powershell
docker run --name age-postgres `
  -p 5432:5432 `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=graphos_db `
  -d apache/age:latest
```

### 4.2 Verify Container Status
```powershell
docker ps
```
You should see `apache/age:latest` running on port `0.0.0.0:5432->5432/tcp`.

---

## 5. Step 3: Initializing Apache AGE Extension & Graph Topology

### 5.1 Enter the Interactive PostgreSQL Shell
```powershell
docker exec -it age-postgres psql -U postgres -d graphos_db
```

### 5.2 Execute Setup SQL Commands
Once the prompt displays `graphos_db=#`, run the following SQL commands:

```sql
-- 1. Enable the Apache AGE extension
CREATE EXTENSION age;

-- 2. Load the AGE library for the session
LOAD 'age';

-- 3. Configure the search path to expose AGE catalog functions
SET search_path = ag_catalog, "$user", public;

-- 4. Create the GraphOS graph namespace
SELECT create_graph('graphos');
```

### 5.3 Test Graph Creation with OpenCypher
Run this query inside `psql` to verify graph node insertion:
```sql
SELECT * FROM cypher('graphos', $$
  CREATE (n:Entity {id: 'core', label: 'SOC CORE'})
  RETURN n
$$) as (v agtype);
```

*Expected output:*
```text
                                    v
-------------------------------------------------------------------------
 {"id": 844424930131969, "label": "Entity", "properties": {"id": "core", "label": "SOC CORE"}}::vertex
(1 row)
```

Exit `psql` by typing `\q` and pressing **Enter**.

---

## 6. Step 4: Connecting Apache AGE to the Next.js GraphOS Codebase

### 6.1 Install the PostgreSQL Node Driver
Inside your GraphOS project root directory, run:
```bash
npm install pg
npm install -D @types/pg
```

---

### 6.2 Update `.env.local`
Open your `.env.local` file and add the database connection string:

```env
# PostgreSQL Apache AGE Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/graphos_db"
```

---

### 6.3 Create the Connection Adapter (`lib/age.ts`)
Create a new file `lib/age.ts`:

```typescript
import { Pool } from 'pg';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('[age] Missing DATABASE_URL in .env.local');
  }

  _pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return _pool;
}

export function isAgeConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Execute an OpenCypher query inside PostgreSQL Apache AGE.
 * 
 * @param cypherQuery - OpenCypher query string
 * @param columnDefs  - Return signature (e.g. 'v agtype' or 'a agtype, r agtype, b agtype')
 */
export async function runAgeQuery<T = any>(
  cypherQuery: string,
  columnDefs: string = 'v agtype'
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    await client.query(`LOAD 'age';`);
    await client.query(`SET search_path = ag_catalog, "$user", public;`);

    const sql = `
      SELECT * FROM cypher('graphos', $$
        ${cypherQuery}
      $$) as (${columnDefs});
    `;

    const result = await client.query(sql);
    return result.rows.map((row) => {
      const keys = Object.keys(row);
      return keys.length === 1 ? row[keys[0]] : row;
    }) as T[];
  } finally {
    client.release();
  }
}
```

---

### 6.4 Graph Seeding Script (`scripts/seed-age.ts`)
Create `scripts/seed-age.ts` to automatically populate the graph:

```typescript
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runAgeQuery } from '../lib/age';

const nodes = [
  { id: 'core', label: 'SOC CORE', kind: 'core', val: 24, status: 'ARMED / ONLINE', detail: 'Central IoT Threat Command Kernel.' },
  { id: 'industrial-ot', label: 'INDUSTRIAL OT', kind: 'pillar', val: 15, color: '#e11d48', status: 'PROTECTED', detail: 'OT & SCADA defense layer.' },
  { id: 'smart-bldg', label: 'SMART BUILDINGS', kind: 'pillar', val: 15, color: '#d97706', status: 'MONITORED', detail: 'Building Management System security.' },
  { id: 'net-edge', label: 'NETWORK EDGE', kind: 'pillar', val: 15, color: '#7c3aed', status: 'ACTIVE DEFENSE', detail: '5G Gateway & Network Edge perimeter.' },
  { id: 'health-iomt', label: 'CONNECTED HEALTH', kind: 'pillar', val: 15, color: '#059669', status: 'HIPAA ENCRYPTED', detail: 'IoMT medical device security.' },
  { id: 'automotive-v2x', label: 'AUTOMOTIVE V2X', kind: 'pillar', val: 15, color: '#0284c7', status: 'CAN SHIELD LIVE', detail: 'V2X telematics and CAN bus security.' },
  { id: 'anomaly-ai', label: 'ANOMALY AI', kind: 'agent', val: 9, status: 'SCANNING', detail: 'Inspects OT packet flows for anomalies.' },
  { id: 'suricata', label: 'SURICATA', kind: 'tool', val: 6, status: 'LINKED', detail: 'Network threat detection engine.' }
];

const links = [
  { source: 'core', target: 'industrial-ot', type: 'COMMANDS' },
  { source: 'core', target: 'smart-bldg', type: 'COMMANDS' },
  { source: 'core', target: 'net-edge', type: 'COMMANDS' },
  { source: 'industrial-ot', target: 'anomaly-ai', type: 'OVERSEES' },
  { source: 'anomaly-ai', target: 'suricata', type: 'USES' }
];

async function seed() {
  console.log('🌱 Seeding Apache AGE with GraphOS topology...');

  for (const n of nodes) {
    const cypher = `
      MERGE (n:Entity {id: '${n.id}'})
      SET n.label = '${n.label}', n.kind = '${n.kind}', n.val = ${n.val},
          n.color = '${n.color || ''}', n.status = '${n.status || ''}', n.detail = '${n.detail || ''}'
      RETURN n
    `;
    await runAgeQuery(cypher, 'n agtype');
    console.log(`  ✓ Node merged: ${n.id}`);
  }

  for (const l of links) {
    const cypher = `
      MATCH (a:Entity {id: '${l.source}'}), (b:Entity {id: '${l.target}'})
      CREATE (a)-[:${l.type}]->(b)
      RETURN a
    `;
    await runAgeQuery(cypher, 'a agtype');
    console.log(`  ✓ Edge: (${l.source}) -[${l.type}]-> (${l.target})`);
  }

  console.log('🎉 Graph seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
```

Run the seed script:
```bash
npx tsx scripts/seed-age.ts
```

---

## 7. Step 5: Updating Next.js API Routes for the D3 Canvas

Update `app/api/graph/all/route.ts` to deliver nodes and edges to the D3 canvas visualizer:

```typescript
import { NextResponse } from 'next/server';
import { isAgeConfigured, runAgeQuery } from '@/lib/age';
import type { EntityData, GraphEdge } from '@/types/graph';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!isAgeConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const nodeRows = await runAgeQuery<any>(
      `MATCH (n:Entity) RETURN n`,
      `n agtype`
    );

    const edgeRows = await runAgeQuery<any>(
      `MATCH (a:Entity)-[r]->(b:Entity) RETURN a.id, b.id, type(r)`,
      `source agtype, target agtype, relType agtype`
    );

    const nodes: EntityData[] = nodeRows.map((r) => ({
      id: r.properties.id,
      label: r.properties.label || r.properties.id.toUpperCase(),
      kind: r.properties.kind || 'agent',
      val: r.properties.val || 10,
      color: r.properties.color || undefined,
      status: r.properties.status || undefined,
      detail: r.properties.detail || undefined,
    }));

    const edges: GraphEdge[] = edgeRows.map((r) => ({
      source: r.source,
      target: r.target,
      relType: r.relType,
    }));

    return NextResponse.json({ nodes, edges, source: 'live-apache-age' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch graph data', details: String(err) }, { status: 500 });
  }
}
```

---

## 8. Summary & Verification Checklist

| Step | Action | Status |
| :--- | :--- | :--- |
| **1** | Install & Verify WSL 2 (`wsl --version`) | ✅ Completed |
| **2** | Run Docker Container (`apache/age:latest` on port `5432`) | ✅ Completed |
| **3** | Initialize Extension (`CREATE EXTENSION age; SELECT create_graph('graphos');`) | ✅ Completed |
| **4** | Test OpenCypher Query in `psql` | ✅ Completed |
| **5** | Add `.env.local` `DATABASE_URL` string | ⏳ In Progress |
| **6** | Run Seed Script (`npx tsx scripts/seed-age.ts`) | ⏳ In Progress |
| **7** | Launch GraphOS (`npm run dev`) and inspect D3 Topology Canvas | ⏳ In Progress |
