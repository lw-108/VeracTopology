# Graph Schema & Relationship Topology — Apache AGE / PostgreSQL

This document defines the graph relationship schema used by GraphOS for topological traversal.
Entity data lives in the PostgreSQL `entities` table (or within the Apache AGE graph `graphos`).

---

## Node Labels

| Label    | Maps to Postgres Table | Stored Properties          | Notes                                           |
| :------- | :--------------------- | :------------------------- | :---------------------------------------------- |
| `Entity` | `entities`             | `id` (TEXT, indexed, PK)   | Single uniform label for all node kinds.        |

---

## Relationship Types

| Relationship | Direction & Pattern | Meaning |
| :----------- | :------------------ | :------ |
| `COMMANDS`   | `(:Entity)-[:COMMANDS]->(:Entity)` | SOC Core kernel → Security Pillar sector |
| `OVERSEES`   | `(:Entity)-[:OVERSEES]->(:Entity)` | Pillar sector → Agent / Task / Human operative |
| `USES`       | `(:Entity)-[:USES]->(:Entity)`     | Agent / Task / Human → Security Tool |

### Relationship Mapping from Static Data

The relationship type is derived from the `kind` of source and target nodes:

| Source Kind | Target Kind | Relationship |
| :---------- | :---------- | :----------- |
| `core`      | `pillar`    | `COMMANDS`   |
| `pillar`    | `agent`     | `OVERSEES`   |
| `pillar`    | `task`      | `OVERSEES`   |
| `pillar`    | `human`     | `OVERSEES`   |
| `agent`     | `tool`      | `USES`       |
| `task`      | `tool`      | `USES`       |
| `human`     | `tool`      | `USES`       |

---

## Relational Schema vs Apache AGE Graph

GraphOS supports two execution modes:

1. **PostgreSQL Relational Tables (Default / Active Mode)**:
   - Nodes stored in `entities` table.
   - Relationships stored in `edges` table (`source_id`, `target_id`, `rel_type`).
   - Fast standard SQL queries with indexed foreign keys.

2. **Apache AGE OpenCypher Graph (Advanced Mode)**:
   - When Apache AGE is enabled on PostgreSQL, OpenCypher queries (`MATCH`, `CREATE`, `MERGE`) execute inside `lib/age.ts`.
