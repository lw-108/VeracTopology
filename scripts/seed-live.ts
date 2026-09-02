/**
 * Seed Script — Populate PostgreSQL (entities + edges tables)
 *
 * Seeds all IoT Cybersecurity nodes and relationships into:
 *   - `entities` table (Postgres relational — source of truth)
 *   - `edges`    table (Postgres relational — relationship store)
 *
 * Also syncs to Apache AGE graph if the extension is installed.
 *
 * Usage: npx tsx scripts/seed-live.ts
 *
 * Requires .env.local with:
 *   DATABASE_URL=postgresql://graphos:Password@123@localhost:5432/graphos
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://graphos:Password@123@localhost:5432/graphos';

const pool = new Pool({ connectionString });

// ── Seed Data ─────────────────────────────────────────────────────────────────

interface SeedNode {
  id: string;
  label: string;
  kind: string;
  val: number;
  color?: string;
  status?: string;
  detail?: string;
}

interface SeedLink {
  source: string;
  target: string;
}

const nodes: SeedNode[] = [
  { id: 'core', label: 'SOC CORE', kind: 'core', val: 24, status: 'ARMED / ONLINE', detail: 'Central IoT Threat Command Kernel. Orchestrates network-wide telemetry, coordinates AI security sentinels, enforces Zero Trust microsegmentation, and executes automated threat containment.' },

  // Pillars
  { id: 'industrial-ot', label: 'INDUSTRIAL OT', kind: 'pillar', val: 15, color: '#e11d48', status: 'PROTECTED', detail: 'Operational Technology & SCADA defense layer. Monitors factory floor sensors, Modbus/OPC-UA industrial protocols, and PLC integrity.' },
  { id: 'smart-bldg', label: 'SMART BUILDINGS', kind: 'pillar', val: 15, color: '#d97706', status: 'MONITORED', detail: 'Building Management System (BMS) security. Safeguards IP cameras, HVAC sensors, smart locks, and access control hardware.' },
  { id: 'net-edge', label: 'NETWORK EDGE', kind: 'pillar', val: 15, color: '#7c3aed', status: 'ACTIVE DEFENSE', detail: '5G Gateway & Network Edge perimeter. Manages edge router firewalls, Deep Packet Inspection (DPI), and secure OTA firmware streams.' },
  { id: 'health-iomt', label: 'CONNECTED HEALTH', kind: 'pillar', val: 15, color: '#059669', status: 'HIPAA ENCRYPTED', detail: 'Internet of Medical Things (IoMT) security. Enforces end-to-end cryptographic integrity for patient monitors and infusion pumps.' },
  { id: 'automotive-v2x', label: 'AUTOMOTIVE V2X', kind: 'pillar', val: 15, color: '#0284c7', status: 'CAN SHIELD LIVE', detail: 'Vehicle-to-Everything (V2X) telematics security. Shields in-vehicle CAN bus and ECU microcontrollers against remote exploits.' },

  // Agents, Tasks & Humans
  { id: 'anomaly-ai', label: 'ANOMALY AI', kind: 'agent', val: 9, status: 'SCANNING (100k pps)', detail: 'ML neural model inspecting OT packet flows for anomalous Modbus payload signatures and timing attacks.' },
  { id: 'plc-audit', label: 'PLC AUDIT', kind: 'task', val: 8, status: 'RUNNING', detail: 'Continuous ladder-logic checksum validation. Detects rogue firmware injection or unauthorized PLC register modifications.' },
  { id: 'ot-eng', label: 'OT SEC ENG', kind: 'human', val: 8, color: '#d97706', status: 'ON-CALL (TIER 3)', detail: 'Human OT security engineer authorized to issue physical air-gap isolations and emergency SCADA overrides.' },

  { id: 'tamper-ai', label: 'TAMPER AI', kind: 'agent', val: 9, status: 'ARMED', detail: 'Computer vision agent detecting physical enclosure opening, optical sensor blinding, or pin-tamper attempts on smart devices.' },
  { id: 'port-scan', label: 'PORT SCAN', kind: 'task', val: 8, status: 'SCHEDULED (1m)', detail: 'Automated network scan identifying unauthenticated rogue Wi-Fi/Bluetooth IoT nodes on corporate building subnets.' },
  { id: 'zero-trust', label: 'ZERO TRUST', kind: 'agent', val: 8, status: 'ACTIVE ENFORCER', detail: 'Dynamically authenticates IoT device certificates and isolates compromised MAC addresses into quarantine VLANs.' },

  { id: 'firmware-ai', label: 'FIRMWARE AI', kind: 'agent', val: 9, status: 'ANALYZING', detail: 'Cross-references edge device firmware binaries against the NIST NVD database to surface zero-day vulnerabilities.' },
  { id: 'ota-patch', label: 'OTA PATCH', kind: 'task', val: 8, status: 'QUEUED', detail: 'Cryptographically signed Over-The-Air firmware deployment pipeline targeting gateway clusters.' },
  { id: 'pcap-stream', label: 'PCAP STREAM', kind: 'task', val: 8, status: 'RECORDING', detail: 'Full packet capture and real-time protocol breakdown for suspicious edge gateway traffic.' },

  { id: 'pki-sentinel', label: 'PKI SENTINEL', kind: 'agent', val: 9, status: 'KEYS SYNCED', detail: 'Manages automated mTLS X.509 certificate issuance, key rotation, and HSM pairing for medical devices.' },
  { id: 'mqtt-audit', label: 'MQTT AUDIT', kind: 'task', val: 8, status: 'PASSING', detail: 'Validates encrypted MQTT topic subscription permissions and rate-limits publish bursts to mitigate DDoS.' },

  { id: 'can-bus-ai', label: 'CAN BUS AI', kind: 'agent', val: 9, status: 'SHIELD ACTIVE', detail: 'In-vehicle IPS. Filters spoofed CAN arbitration IDs and blocks unauthorized OBD-II diagnostic injection.' },
  { id: 'isolation', label: 'ISOLATION', kind: 'task', val: 8, status: 'STANDBY', detail: 'Instant network kill-switch task that drops BGP routes and isolates compromised vehicle telematics units.' },
  { id: 'soc-analyst', label: 'SOC ANALYST', kind: 'human', val: 8, color: '#d97706', status: 'ACTIVE MONITOR', detail: 'Senior Cybersecurity Operations Center analyst reviewing correlated IoT threat vectors and approving mitigation playbooks.' },

  // Tools
  { id: 'wireshark', label: 'WIRESHARK', kind: 'tool', val: 6, status: 'LINKED', detail: 'Protocol analyzer capturing raw 802.15.4, Zigbee, and Ethernet frames for forensic inspection.' },
  { id: 'shodan', label: 'SHODAN', kind: 'tool', val: 6, status: 'LINKED', detail: 'External attack surface monitoring engine feeding exposure data for publicly accessible IoT IP addresses.' },
  { id: 'suricata', label: 'SURICATA', kind: 'tool', val: 6, status: 'LINKED', detail: 'High-speed network threat detection engine matching signature rules for IoT botnets like Mirai and Mozi.' },
  { id: 'vault', label: 'VAULT', kind: 'tool', val: 6, status: 'LINKED', detail: 'Centralized secrets manager and PKI root CA for signing device firmware and storing symmetric encryption keys.' },
  { id: 'zeek', label: 'ZEEK', kind: 'tool', val: 6, status: 'LINKED', detail: 'Network security monitoring platform translating raw traffic into structured JSON behavioral security logs.' },
  { id: 'metasploit', label: 'METASPLOIT', kind: 'tool', val: 6, status: 'LINKED', detail: 'Penetration testing platform executing authorized vulnerability verification scripts against IoT endpoints.' },
  { id: 'kibana', label: 'KIBANA SOC', kind: 'tool', val: 6, status: 'LINKED', detail: 'Real-time SIEM dashboard for incident correlation and alert aggregation.' },
  { id: 'nmap-ot', label: 'NMAP OT', kind: 'tool', val: 6, status: 'LINKED', detail: 'Specialized port discovery tool with NSE scripts for probing BACnet, Modbus, and EtherNet/IP industrial ports.' },
];

const links: SeedLink[] = [
  // Core → Pillars
  { source: 'core', target: 'industrial-ot' },
  { source: 'core', target: 'smart-bldg' },
  { source: 'core', target: 'net-edge' },
  { source: 'core', target: 'health-iomt' },
  { source: 'core', target: 'automotive-v2x' },
  // Pillar → Agents/Tasks/Humans
  { source: 'industrial-ot', target: 'anomaly-ai' },
  { source: 'industrial-ot', target: 'plc-audit' },
  { source: 'industrial-ot', target: 'ot-eng' },
  { source: 'smart-bldg', target: 'tamper-ai' },
  { source: 'smart-bldg', target: 'port-scan' },
  { source: 'smart-bldg', target: 'zero-trust' },
  { source: 'net-edge', target: 'firmware-ai' },
  { source: 'net-edge', target: 'ota-patch' },
  { source: 'net-edge', target: 'pcap-stream' },
  { source: 'health-iomt', target: 'pki-sentinel' },
  { source: 'health-iomt', target: 'mqtt-audit' },
  { source: 'automotive-v2x', target: 'can-bus-ai' },
  { source: 'automotive-v2x', target: 'isolation' },
  { source: 'automotive-v2x', target: 'soc-analyst' },
  // Agents/Tasks → Tools
  { source: 'anomaly-ai', target: 'suricata' },
  { source: 'anomaly-ai', target: 'wireshark' },
  { source: 'plc-audit', target: 'nmap-ot' },
  { source: 'ot-eng', target: 'kibana' },
  { source: 'tamper-ai', target: 'kibana' },
  { source: 'port-scan', target: 'shodan' },
  { source: 'port-scan', target: 'nmap-ot' },
  { source: 'zero-trust', target: 'vault' },
  { source: 'firmware-ai', target: 'shodan' },
  { source: 'firmware-ai', target: 'metasploit' },
  { source: 'ota-patch', target: 'vault' },
  { source: 'pcap-stream', target: 'zeek' },
  { source: 'pcap-stream', target: 'wireshark' },
  { source: 'pki-sentinel', target: 'vault' },
  { source: 'mqtt-audit', target: 'zeek' },
  { source: 'can-bus-ai', target: 'suricata' },
  { source: 'isolation', target: 'kibana' },
  { source: 'soc-analyst', target: 'kibana' },
];

function inferRelType(sourceKind: string, targetKind: string): string {
  if (sourceKind === 'core' && targetKind === 'pillar') return 'COMMANDS';
  if (sourceKind === 'pillar' && ['agent', 'task', 'human'].includes(targetKind)) return 'OVERSEES';
  if (['agent', 'task', 'human'].includes(sourceKind) && targetKind === 'tool') return 'USES';
  return 'USES';
}

// ── Bootstrap Tables ──────────────────────────────────────────────────────────

async function bootstrapTables(client: any) {
  console.log('\n📋 Bootstrapping database tables...');

  await client.query(`
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
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS edges (
      id          SERIAL PRIMARY KEY,
      source_id   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      target_id   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      rel_type    TEXT NOT NULL DEFAULT 'USES',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities (kind)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges (source_id)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges (target_id)
  `);

  console.log('  ✅ Tables ready: entities, edges');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 GraphOS Live Seed Script');
  console.log(`   DB: ${connectionString.replace(/:([^:@]+)@/, ':***@')}\n`);

  const client = await pool.connect();

  try {
    await bootstrapTables(client);

    // ── Seed Entities ──────────────────────────────────────────────────────
    console.log(`\n📦 Seeding ${nodes.length} entities...`);

    for (const node of nodes) {
      await client.query(
        `INSERT INTO entities (id, label, kind, val, color, status, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE
           SET label = EXCLUDED.label,
               kind  = EXCLUDED.kind,
               val   = EXCLUDED.val,
               color = EXCLUDED.color,
               status = EXCLUDED.status,
               detail = EXCLUDED.detail,
               updated_at = NOW()`,
        [
          node.id,
          node.label,
          node.kind,
          node.val,
          node.color ?? null,
          node.status ?? null,
          node.detail ?? null,
        ],
      );
    }
    console.log(`  ✅ ${nodes.length} entities seeded`);

    // ── Seed Edges ─────────────────────────────────────────────────────────
    const nodeKindMap = new Map(nodes.map((n) => [n.id, n.kind]));
    console.log(`\n🔗 Seeding ${links.length} edges...`);

    // Clear existing edges to avoid duplicates on re-seed
    await client.query(`DELETE FROM edges`);

    for (const link of links) {
      const relType = inferRelType(
        nodeKindMap.get(link.source) ?? 'agent',
        nodeKindMap.get(link.target) ?? 'tool',
      );
      await client.query(
        `INSERT INTO edges (source_id, target_id, rel_type) VALUES ($1, $2, $3)`,
        [link.source, link.target, relType],
      );
    }
    console.log(`  ✅ ${links.length} edges seeded`);

    // ── Summary ────────────────────────────────────────────────────────────
    const { rows: entityCount } = await client.query(`SELECT COUNT(*) FROM entities`);
    const { rows: edgeCount } = await client.query(`SELECT COUNT(*) FROM edges`);

    console.log('\n🎉 Seed complete!');
    console.log(`   entities table: ${entityCount[0].count} rows`);
    console.log(`   edges table:    ${edgeCount[0].count} rows`);
    console.log('\n💡 Start your app and the graph will load from live PostgreSQL data!');
    console.log('   API response will show: source: "live-postgres"');

  } catch (err: any) {
    console.error('\n💥 Seed failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
