# Neo4j Graph Schema — IoT Cyber Security Mesh

This document defines the Neo4j graph schema used by VeracTopology for relationship traversal.
Neo4j is **not** the source of truth for entity data — that lives in Postgres/Supabase.
Neo4j stores only node IDs (matching Postgres PKs) and typed relationships.

---

## Node Labels

| Label    | Maps to Postgres Table | Stored Properties          | Notes                                           |
| :------- | :--------------------- | :------------------------- | :---------------------------------------------- |
| `Entity` | `entities`             | `id` (TEXT, indexed, UUID) | Single label for all node types. The `kind` field lives only in Postgres. |

> **Design decision**: A single `Entity` label (rather than separate `Core`, `Pillar`, `Agent`, etc.) keeps the Cypher queries simple and the index uniform. Filtering by kind is done after hydration from Postgres.

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

## Indexes

```cypher
CREATE INDEX entity_id_index IF NOT EXISTS FOR (n:Entity) ON (n.id)
```

This ensures all `MATCH (n:Entity {id: $nodeId})` queries use `NodeUniqueIndexSeek` rather than `NodeByLabelScan`.

---

## Example Queries

### Neighborhood traversal (used by `/api/graph/[nodeId]`)
```cypher
MATCH (n:Entity {id: $nodeId})-[r]-(m:Entity)
RETURN n.id AS source, m.id AS target, type(r) AS relType
LIMIT 200
```

### Full graph export (admin/debug only)
```cypher
MATCH (n:Entity)-[r]->(m:Entity)
RETURN n.id AS source, m.id AS target, type(r) AS relType
```

### Blast radius analysis (future feature)
```cypher
MATCH path = (compromised:Entity {id: $nodeId})-[*1..3]-(affected:Entity)
RETURN DISTINCT affected.id AS affectedId, length(path) AS hops
ORDER BY hops
LIMIT 100
```
