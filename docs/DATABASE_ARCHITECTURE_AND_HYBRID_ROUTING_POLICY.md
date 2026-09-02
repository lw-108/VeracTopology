# Unified Database Architecture & Data Policy
## PostgreSQL + Apache AGE (Relational & OpenCypher Graph Engine)

---

## 1. Executive Summary & Core Directive

In accordance with open-source system reliability standards and infrastructure consolidation goals, the application architecture runs exclusively on a **Unified PostgreSQL + Apache AGE Engine**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                SYSTEM ARCHITECTURE DIRECTIVE                                │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                          UNIFIED SYSTEM OF RECORD & GRAPH ENGINE                            │
│                                                                                             │
│                                  POSTGRESQL + APACHE AGE                                    │
│                           (Relational + OpenCypher Graph Engine)                            │
│                                                                                             │
│ • Authoritative persistence & ACID transactions                                             │
│ • Relational tables: entities, edges, users, projects, and asset metadata                   │
│ • Graph traversals via OpenCypher syntax inside standard SQL queries                        │
│ • 100% Free & Open-Source (Zero proprietary license restrictions)                           │
│ • Single unified backup & restore lifecycle (pg_dump / pg_restore)                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

> **Mandatory Policy Directive:**
> 1. **PostgreSQL** is the sole **System of Record** powering all relational tables (`entities`, `edges`), workspace projects, user data, and metadata.
> 2. **Apache AGE** executes graph queries (`MATCH`, `CREATE`, `MERGE`) directly on top of PostgreSQL without requiring any external graph servers.
> 3. Proprietary external graph databases (e.g. Neo4j) are completely removed from the stack to eliminate third-party licensing fees, network latency overhead, and dual-database sync complexity.

---

## 2. Why We Consolidate on PostgreSQL + Apache AGE

### 2.1 Licensing & Reliability Advantages
- **Zero Licensing Overhead:** Apache AGE is an official Apache Software Foundation project that runs as a lightweight extension inside PostgreSQL. Features like multi-tenancy, high-availability replication, automated backups, and fine-grained security are **100% free** via standard PostgreSQL tools (`pg_dump`, WAL streaming, Patroni).
- **Full ACID Reliability:** Every graph node and edge creation in Apache AGE shares PostgreSQL’s write-ahead log (WAL) and transactional guarantees.
- **Relational + Graph Hybrid Queries:** Allows joining relational user accounts and project metadata with graph topologies in a single SQL query using `agtype`.

---

## 3. Workload Routing Matrix

| Application Workload / Feature | Primary Engine | Routing Rationale |
|---|---|---|
| **Graph Topology Rendering** | **PostgreSQL (`entities` + `edges`) / Apache AGE** | Direct fast query on indexed relational tables and OpenCypher queries. |
| **Node & Edge Mutations (CRUD)** | **PostgreSQL (`entities` + `edges`) / Apache AGE** | ACID transactional inserts with cascade deletes. |
| **User & Project Workspaces** | **PostgreSQL** | Relational user schemas, role-based access, and project metadata. |
| **Asset Metadata Catalog** | **PostgreSQL (`entities.metadata`)** | JSONB extensible property bag. |
| **Backup & Disaster Recovery** | **PostgreSQL** | Single unified `pg_dump` snapshot backs up both relational tables and graph data. |

---

## 4. Primary Connection Settings

Configured in `.env.local`:

```env
DATABASE_URL=postgresql://graphos:Password@123@localhost:5432/graphos
```
