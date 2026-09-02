# System Architecture & Technical Specification (PlanOfApp)

**Project Name:** IoT Cyber Security Mesh & Threat Topology (GraphOS)  
**Document Purpose:** Unified Architecture Specification, Technical Design & Implementation Record  
**Document Version:** 4.0 (Live PostgreSQL Integration — Active)  
**Date:** September 2, 2026  

---

## 1. System Architecture Overview

**GraphOS** is built on a decoupled, micro-service-ready web architecture leveraging Next.js 13 (App Router), React 18, dynamic physics-based graph rendering (`d3-force` & `@xyflow/react`), and a **Unified Single-Stack Database Architecture** powered by **PostgreSQL + Apache AGE**.

Following our updated system plan, GraphOS consolidates relational asset tables, project metadata, and threat topology graph relationships into a single PostgreSQL engine using the open-source **Apache AGE** extension. This eliminates dual-database operational overhead and Neo4j licensing constraints while retaining standard **OpenCypher** query execution.

```mermaid
graph TD
    subgraph Presentation Layer
        UI["React 18 Client Components"]
        Canvas["d3-force & Custom SVG Orbital Canvas"]
        FlowCanvas["@xyflow/react Node/Edge Flow Engine"]
        Drawer["User & Project Workspace Manager"]
    end

    subgraph API & Service Layer (Next.js App Router)
        GraphAPI["/api/graph/all & /api/graph/[nodeId]"]
        CreateAPI["/api/graph/create"]
        UserAPI["/api/user/*"]
        HydrationEngine["Graph Hydration & Fallback Engine"]
    end

    subgraph Unified Data Abstraction Layer
        AgeDriver["lib/age.ts (PostgreSQL + Apache AGE Driver)"]
        OfflineMock["lib/default-topology.ts (Offline Resilience Engine)"]
    end

    subgraph Unified Persistence Layer
        PostgresDB[("PostgreSQL + Apache AGE\n(Unified System of Record & OpenCypher Graph)")]
    end

    UI --> Canvas
    UI --> FlowCanvas
    UI --> Drawer
    Canvas --> GraphAPI
    Drawer --> UserAPI
    GraphAPI --> HydrationEngine
    CreateAPI --> HydrationEngine
    HydrationEngine --> AgeDriver
    HydrationEngine --> OfflineMock
    AgeDriver --> PostgresDB
```

---

## 2. Updated Database Strategy & Migration Rationale

### 2.1 Why We Consolidated to PostgreSQL + Apache AGE
1. **Single Database Stack & Reduced DevOps Overhead**:  
   Eliminating a separate Neo4j cluster reduces hosting costs, memory usage, backup complexity (`pg_dump` backs up both SQL tables and graph data), and networking bridges.
2. **Unified Relational + Graph Queries (Hybrid SQL/Cypher)**:  
   With Apache AGE, graph traversals (`cypher(...)`) can be directly joined with relational user sessions, project tables, and threat telemetry logs inside standard SQL queries.
3. **100% Free & Open-Source (Zero License Restrictions)**:  
   Eliminates Neo4j Enterprise core licensing costs while retaining enterprise-grade PostgreSQL features (WAL streaming, replication, Patroni HA).
4. **OpenCypher Standard Compliance**:  
   Queries use standard Cypher (`MATCH`, `CREATE`, `MERGE`). Should enterprise scaling require a dedicated graph cluster in the far future, queries remain 100% compatible.

---

## 3. Historical Implementation Steps & Evolution Log

### Phase 1 (v0.1): Next.js Foundation & Baseline UI
- Initialized Next.js 13 App Router project using TypeScript (`5.2.2`) and Node.js `>=20`.
- Configured TailwindCSS (`3.3.3`), PostCSS, Radix UI accessibility components, and dark/light design tokens in `app/globals.css`.
- Built initial static flow canvas using `@xyflow/react`.

### Phase 2 (v0.5): Orbital Physics Engine & Dynamic SVG Pipeline
- **d3-force Physics Integration**: Built dynamic 2D force-directed layout simulation (`components/flow-graph.tsx`) with concentric orbital perimeters (Tier 0 Core to Tier 3 Threat Perimeters).
- **Custom Security Node UI**: Built `components/custom-node.tsx` with status glow indicators (Healthy, Warning, Critical, Threat Vector) and dynamic Lucide React icons.
- **Curved Arc Geometry & Synapse Pulses**: Implemented Bezier curve edge calculation (`lib/edge-arc.ts`) with CSS keyframe stroke animations simulating real-time packet traversal.

### Phase 3 (v0.8): Dual-Database Prototype Phase
- Prototype phase introduced Neo4j alongside PostgreSQL for fast 1-hop traversals.
- Created initial database seeding scripts (`scripts/seed.ts`, `scripts/seed-complex.ts`, `scripts/create-indexes.ts`).

### Phase 4 (v0.9): Workspace Manager & Resilience Fallbacks
- Implemented `components/user-project-manager.tsx` supporting project saving, multi-project switching, topology export, and Supabase integration.
- Built in-memory fallback topology (`lib/default-topology.ts`) guaranteeing zero UI downtime when remote databases are offline.

### Phase 5 (v2.0): Unified PostgreSQL + Apache AGE Architecture Plan
- **Architecture Strategy Shift**: Consolidated database engine fully into **PostgreSQL + Apache AGE** to eliminate external graph licensing overhead.
- **Unified Driver Implementation**: Standardized backend query execution on `lib/age.ts`.
- **Seeding Pipeline Update**: Standardized graph initialization on `scripts/seed-age.ts`.
- **Serverless Cloud Configuration**: Configured `netlify.toml` for Netlify Next.js App Router deployment.

### Phase 6 (v3.0 — September 2, 2026): Live PostgreSQL Integration ✅ COMPLETE
- **Problem Identified**: Apache AGE extension not installed on local PostgreSQL instance; app was always loading hardcoded fallback topology.
- **New Shared Pool Module** ([`lib/pg.ts`](file:///c:/Users/linge/Downloads/GraphOS-main/GraphOS-main/lib/pg.ts)): Created singleton `pg.Pool` connected via `DATABASE_URL` for all direct relational queries.
- **Removed Supabase Dependency** ([`lib/data/entityService.ts`](file:///c:/Users/linge/Downloads/GraphOS-main/GraphOS-main/lib/data/entityService.ts)): Replaced Supabase SDK calls with direct `pg` parameterized queries. AGE sync retained as optional layer.
- **Postgres-Only Routing** ([`app/api/graph/all/route.ts`](file:///c:/Users/linge/Downloads/GraphOS-main/GraphOS-main/app/api/graph/all/route.ts)): API now has a 3-tier data source priority:
  1. Apache AGE (graph queries — activates when AGE installed)
  2. **PostgreSQL `entities` + `edges` tables** (active path — live data)
  3. Hardcoded default topology (last-resort fallback)
- **Create Route Updated** ([`app/api/graph/create/route.ts`](file:///c:/Users/linge/Downloads/GraphOS-main/GraphOS-main/app/api/graph/create/route.ts)): New nodes/edges are persisted to Postgres tables when AGE not available.
- **Live Seed Script** ([`scripts/seed-live.ts`](file:///c:/Users/linge/Downloads/GraphOS-main/GraphOS-main/scripts/seed-live.ts)): Self-contained script that bootstraps `entities` + `edges` tables and seeds all IoT topology data.
- **Verified Result**: Database seeded with **28 entities** and **37 edges**. API returns `source: "live-postgres"`. Application loads live topology data. ✅

---

## 4. Frontend & Physics Rendering Engine Architecture

### 4.1 Physics Engine & Orbital Perimeter Alignment (`components/flow-graph.tsx`)
- **d3-force Physics Simulation**:
  - `forceManyBody()`: Node repulsion preventing visual overlap (`strength: -400`).
  - `forceLink()`: Spring dynamics based on edge distance (`distance: 120`).
  - `forceCollide()`: Collision buffers preventing node overlap.
  - `forceRadial()`: Concentric orbital positioning allocating nodes into security perimeters:
    - **Tier 0 (Core SOC Services)**: Inner orbit ($R = 0px - 150px$)
    - **Tier 1 (Internal IoT Mesh)**: Middle-inner orbit ($R = 250px$)
    - **Tier 2 (Edge Gateways & Firewalls)**: Middle-outer orbit ($R = 450px$)
    - **Tier 3 (Threat Vectors & External)**: Outer perimeter orbit ($R = 650px$)

### 4.2 SVG Render Pipeline & Synapse Flow (`lib/edge-arc.ts`, `components/custom-node.tsx`)
- **Custom Curved Edge Arcs**: Real-time quadratic Bezier paths preventing edge line overlap in dense meshes.
- **Animated Synapse Pulses**: SVG `<circle>` elements with CSS stroke dash offset keyframes simulating packet traversal.
- **Node UI Components (`custom-node.tsx`)**: Modular React components supporting status glow alerts and hover inspector popovers displaying latency, CVE vulnerabilities, and device IP endpoints.

---

## 5. Data Schemas & Graph Specifications

### 5.1 Relational Schema — Active (Postgres-Only Mode)

Two tables are live in the `graphos` database as of September 2, 2026:

```sql
-- Entities Table (Node Source of Truth) — 28 rows live
CREATE TABLE IF NOT EXISTS entities (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('core','pillar','agent','task','tool','human')),
  val        INTEGER NOT NULL DEFAULT 10,
  color      TEXT,
  status     TEXT,
  detail     TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edges Table (Relationship Store) — 37 rows live
CREATE TABLE IF NOT EXISTS edges (
  id          SERIAL PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rel_type    TEXT NOT NULL DEFAULT 'USES',  -- COMMANDS | OVERSEES | USES
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Live Data Summary (as of Sept 2, 2026):**

| kind | count |
|------|-------|
| core | 1 |
| pillar | 5 |
| agent | 6 |
| task | 7 |
| human | 2 |
| tool | 8 |
| **Total** | **28** |

| rel_type | count |
|----------|-------|
| COMMANDS | 5 |
| OVERSEES | 14 |
| USES | 18 |
| **Total** | **37** |

### 5.2 Apache AGE Graph Schema (`docs/graph-schema.md`)
Single uniform label `:Entity` is used inside Apache AGE graph `graphos` to maximize index efficiency (`NodeUniqueIndexSeek`).

| Source Kind | Target Kind | Relationship Type | Meaning & Cyber Mesh Context |
| :--- | :--- | :--- | :--- |
| `core` | `pillar` | `COMMANDS` | SOC Central Controller → Security Perimeter Hub |
| `pillar` | `agent` | `OVERSEES` | Security Hub → AI Monitoring Agent / Scanner |
| `pillar` | `task` | `OVERSEES` | Security Hub → Security Automation Script |
| `agent` | `tool` | `USES` | Monitoring Agent → Port Scanner / Firewall Tool |
| `threat` | `gateway` | `EXPLOITS` | Cyber Threat Vector → Compromised IoT Gateway |
| `gateway` | `sensor` | `ROUTES_TO` | IoT Gateway → Edge Sensor Array |

---

## 6. API Route Handlers Architecture (`app/api/`)

| Endpoint Route | Method | Purpose | Backend Query Driver |
| :--- | :--- | :--- | :--- |
| `/api/graph/all` | `GET` | Returns all nodes + edges — Priority: AGE → Postgres tables → fallback | `lib/pg.ts` → `entities` + `edges` tables ✅ Live |
| `/api/graph/[nodeId]` | `GET` | Fetches 1-hop neighborhood & blast radius for selected node | `lib/age.ts` (Apache AGE Cypher) |
| `/api/graph/create` | `POST` | Inserts new node/edge — writes to Postgres tables (AGE if installed) | `lib/pg.ts` → `entities` + `edges` ✅ Live |
| `/api/user/projects` | `GET / POST` | Workspace project management & configuration persistence | PostgreSQL / Supabase |

---

## 7. Directory & Component Architecture Map

```
GraphOS-main/
├── app/                        # Next.js 13 App Router Architecture
│   ├── api/                    # Serverless REST API Route Handlers
│   │   ├── graph/              # Graph query, creation & neighborhood endpoints
│   │   └── user/               # User authentication & project drawer APIs
│   ├── globals.css             # Tailwind CSS tokens & custom animation keyframes
│   ├── layout.tsx              # Root HTML Layout wrapper & font loaders
│   └── page.tsx                # Main Application Page Entry Point
├── components/                 # React 18 UI Component Hierarchy
│   ├── custom-node.tsx         # Node UI, status badges, and inspector popups
│   ├── flow-graph.tsx          # d3-force physics engine & SVG canvas wrapper
│   ├── user-project-manager.tsx# Workspace project drawer & snapshot exporter
│   └── ui/                     # Accessible Radix UI design system primitives
├── docs/                       # Architectural & Technical Manuals
│   ├── DATABASE_ARCHITECTURE_AND_HYBRID_ROUTING_POLICY.md
│   ├── POSTGRES_APACHE_AGE_EVALUATION_AND_GUIDE.md
│   ├── graph-schema.md
│   └── postgres-schema.sql
├── lib/                        # Backend Drivers & Technical Utilities
│   ├── age.ts                  # PostgreSQL + Apache AGE query execution driver
│   ├── pg.ts                   # ✅ NEW: Shared singleton pg.Pool for relational queries
│   ├── data/
│   │   └── entityService.ts    # ✅ UPDATED: Write-through service (Postgres + AGE sync)
│   ├── default-topology.ts     # Offline mock graph topology dataset
│   ├── edge-arc.ts             # Curved SVG Bezier arc geometry calculator
│   ├── flow-layout.ts          # Tree & radial layout positioning logic
│   └── supabase.ts             # Supabase cloud authentication client (legacy)
├── public/                     # Static media & vector icons
├── scripts/                    # Database migrations & automated seeding pipelines
│   ├── seed-live.ts            # ✅ NEW: Live PostgreSQL seed (entities + edges tables)
│   └── seed-age.ts             # Apache AGE graph seeding script (when AGE installed)
├── PlanOfApp.md                # System Architecture & Technical Specification
├── package.json                # Dependency manifest & script runners
└── tailwind.config.ts          # Utility tokens & custom animation definitions
```

---

## 8. Deployment & Production Operations

- **Netlify Serverless Deployment (`netlify.toml`)**: Optimized for Next.js App Router using `@netlify/plugin-nextjs`.
- **Environment Configuration (`.env.local`)**:
  ```env
  DATABASE_URL=postgresql://graphos:Password@123@localhost:5432/graphos
  ```
- **Local Development Database**: PostgreSQL 17 running on `localhost:5432`, database `graphos`, role `graphos`.
- **Seeding Execution (Postgres-Only Mode — current)**:
  ```bash
  npx tsx scripts/seed-live.ts
  ```
- **Seeding Execution (With Apache AGE — future)**:
  ```bash
  npx tsx scripts/seed-age.ts
  ```
- **Verify Live Data in DBeaver**:
  ```sql
  SELECT kind, COUNT(*) FROM entities GROUP BY kind;
  SELECT rel_type, COUNT(*) FROM edges GROUP BY rel_type;
  ```
- **API Data Source Verification** (check browser network tab on `/api/graph/all`):
  - `source: "live-postgres"` → Reading from DB ✅
  - `source: "live-apache-age"` → Reading from AGE graph ✅
  - `source: "fallback-topology"` → DB unreachable, using hardcoded data ⚠️
