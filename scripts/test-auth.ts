import { config } from 'dotenv';
config({ path: '.env.local' });
import neo4j from 'neo4j-driver';

async function run() {
  const uri = process.env.NEO4J_URI!;
  const user = process.env.NEO4J_USER!;
  const pass = process.env.NEO4J_PASSWORD!;
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));

  // Test 1: session with default database (undefined)
  try {
    const session = driver.session();
    const res = await session.run('RETURN 1 AS num');
    console.log('✅ Success with default session (no database specified)! Result:', res.records[0].get('num'));
    await session.close();
  } catch (err: any) {
    console.log('❌ Default session failed:', err.message);
  }

  // Test 2: session with database '0479477b'
  try {
    const session = driver.session({ database: '0479477b' });
    const res = await session.run('RETURN 1 AS num');
    console.log('✅ Success with database "0479477b"! Result:', res.records[0].get('num'));
    await session.close();
  } catch (err: any) {
    console.log('❌ Database "0479477b" failed:', err.message);
  }

  await driver.close();
}

run();
