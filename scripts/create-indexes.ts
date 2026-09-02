/**
 * Create Indexes — Neo4j
 *
 * Creates the required index on Entity.id for fast lookups.
 * Run this once after schema is confirmed, before load-testing.
 *
 * Usage: npx tsx scripts/create-indexes.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { runQuery, closeDriver } from '../lib/neo4j';

async function main() {
  console.log('📇 Creating Neo4j indexes...\n');

  // Create the entity ID index
  try {
    await runQuery(
      `CREATE INDEX entity_id_index IF NOT EXISTS FOR (n:Entity) ON (n.id)`,
    );
    console.log('  ✅ Index entity_id_index created (or already exists)');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('  ❌ Failed to create index:', msg);
    process.exit(1);
  }

  // Verify by listing indexes
  try {
    const indexes = await runQuery<{ name: string; labelsOrTypes: string[]; properties: string[] }>(
      `SHOW INDEXES YIELD name, labelsOrTypes, properties
       WHERE name = 'entity_id_index'
       RETURN name, labelsOrTypes, properties`,
    );

    if (indexes.length > 0) {
      console.log('\n  📋 Verified index:');
      for (const idx of indexes) {
        console.log(`     Name: ${idx.name}`);
        console.log(`     Labels: ${JSON.stringify(idx.labelsOrTypes)}`);
        console.log(`     Properties: ${JSON.stringify(idx.properties)}`);
      }
    } else {
      console.log('\n  ⚠️  Index not found in SHOW INDEXES — it may still be building');
    }
  } catch (err) {
    console.log('  ℹ️  Could not verify index (SHOW INDEXES may not be supported):', 
      err instanceof Error ? err.message : err);
  }

  await closeDriver();
  console.log('\n🎉 Index creation complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Index creation failed:', err);
  process.exit(1);
});
