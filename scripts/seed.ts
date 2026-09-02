/**
 * Seed Script — Populate Neo4j from embedded graph data
 *
 * Contains all IoT Cybersecurity node and relationship data inline.
 * No dependency on lib/graph-data.ts — this is a self-contained seed.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires .env.local to be configured with valid Neo4j credentials.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { runQuery, closeDriver } from '../lib/neo4j';

// ── Embedded Seed Data ─────────────────────────────────────────────────────────

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
  { id: 'industrial-ot', label: 'INDUSTRIAL OT', kind: 'pillar', val: 15, color: '#e11d48', status: 'PROTECTED', detail: 'Operational Technology & SCADA defense layer. Monitors factory floor sensors, Modbus/OPC-UA industrial protocols, and Programmable Logic Controller (PLC) integrity.' },
  { id: 'smart-bldg', label: 'SMART BUILDINGS', kind: 'pillar', val: 15, color: '#d97706', status: 'MONITORED', detail: 'Building Management System (BMS) security. Safeguards IP cameras, HVAC sensors, smart locks, and access control hardware from unauthorized network intrusions.' },
  { id: 'net-edge', label: 'NETWORK EDGE', kind: 'pillar', val: 15, color: '#7c3aed', status: 'ACTIVE DEFENSE', detail: '5G Gateway & Network Edge perimeter. Manages edge router firewalls, Deep Packet Inspection (DPI), and secure over-the-air firmware update streams.' },
  { id: 'health-iomt', label: 'CONNECTED HEALTH', kind: 'pillar', val: 15, color: '#059669', status: 'HIPAA ENCRYPTED', detail: 'Internet of Medical Things (IoMT) security. Enforces end-to-end cryptographic integrity for patient monitors, infusion pumps, and hospital telemetry networks.' },
  { id: 'automotive-v2x', label: 'AUTOMOTIVE V2X', kind: 'pillar', val: 15, color: '#0284c7', status: 'CAN SHIELD LIVE', detail: 'Vehicle-to-Everything (V2X) telematics security. Shields in-vehicle CAN bus architecture and ECU microcontrollers against remote exploit attempts.' },

  // Agents, Tasks & Humans
  { id: 'anomaly-ai', label: 'ANOMALY AI', kind: 'agent', val: 9, status: 'SCANNING (100k pps)', detail: 'Machine learning neural model inspecting OT packet flows for anomalous Modbus payload signatures and timing attacks.' },
  { id: 'plc-audit', label: 'PLC AUDIT', kind: 'task', val: 8, status: 'RUNNING', detail: 'Continuous ladder-logic checksum validation. Detects rogue firmware injection or unauthorized PLC register modifications.' },
  { id: 'ot-eng', label: 'OT SEC ENG', kind: 'human', val: 8, color: '#d97706', status: 'ON-CALL (TIER 3)', detail: 'Human OT security engineer authorized to issue physical air-gap isolations and emergency SCADA overrides.' },

  { id: 'tamper-ai', label: 'TAMPER AI', kind: 'agent', val: 9, status: 'ARMED', detail: 'Computer vision and optical sensor agent detecting physical enclosure opening, optical sensor blinding, or pin-tamper attempts on smart devices.' },
  { id: 'port-scan', label: 'PORT SCAN', kind: 'task', val: 8, status: 'SCHEDULED (1m)', detail: 'Automated network scan identifying unauthenticated rogue Wi-Fi/Bluetooth IoT nodes plugged into corporate building subnets.' },
  { id: 'zero-trust', label: 'ZERO TRUST', kind: 'agent', val: 8, status: 'ACTIVE ENFORCER', detail: 'Dynamically authenticates IoT device certificates and dynamically isolates compromised MAC addresses into quarantine VLANs.' },

  { id: 'firmware-ai', label: 'FIRMWARE AI', kind: 'agent', val: 9, status: 'ANALYZING', detail: 'Cross-references edge device firmware binaries against the NIST NVD database to surface zero-day vulnerabilities prior to exploit.' },
  { id: 'ota-patch', label: 'OTA PATCH', kind: 'task', val: 8, status: 'QUEUED', detail: 'Cryptographically signed Over-The-Air firmware deployment pipeline targeting gateway clusters.' },
  { id: 'pcap-stream', label: 'PCAP STREAM', kind: 'task', val: 8, status: 'RECORDING', detail: 'Full packet capture and real-time protocol breakdown for suspicious edge gateway traffic.' },

  { id: 'pki-sentinel', label: 'PKI SENTINEL', kind: 'agent', val: 9, status: 'KEYS SYNCED', detail: 'Manages automated mTLS X.509 certificate issuance, short-lived key rotation, and hardware security module (HSM) pairing for medical devices.' },
  { id: 'mqtt-audit', label: 'MQTT AUDIT', kind: 'task', val: 8, status: 'PASSING', detail: 'Validates encrypted MQTT topic subscription permissions and rate-limits publish bursts to mitigate DDoS attacks.' },

  { id: 'can-bus-ai', label: 'CAN BUS AI', kind: 'agent', val: 9, status: 'SHIELD ACTIVE', detail: 'In-vehicle Intrusion Prevention System. Filters spoofed CAN arbitration IDs and blocks unauthorized OBD-II diagnostic injection.' },
  { id: 'isolation', label: 'ISOLATION', kind: 'task', val: 8, status: 'STANDBY', detail: 'Instant network kill-switch task that drops BGP routes and isolates compromised vehicle telematics units.' },
  { id: 'soc-analyst', label: 'SOC ANALYST', kind: 'human', val: 8, color: '#d97706', status: 'ACTIVE MONITOR', detail: 'Senior Cybersecurity Operations Center analyst reviewing correlated IoT threat vectors and approving mitigation playbooks.' },

  // Tools
  { id: 'wireshark', label: 'WIRESHARK', kind: 'tool', val: 6, status: 'LINKED', detail: 'Industry-standard protocol analyzer capturing raw 802.15.4, Zigbee, and Ethernet frames for forensic inspection.' },
  { id: 'shodan', label: 'SHODAN', kind: 'tool', val: 6, status: 'LINKED', detail: 'External attack surface monitoring engine feeding exposure data for publicly accessible IoT IP addresses.' },
  { id: 'suricata', label: 'SURICATA', kind: 'tool', val: 6, status: 'LINKED', detail: 'High-speed network threat detection engine matching signature rules for IoT botnets like Mirai and Mozi.' },
  { id: 'vault', label: 'VAULT', kind: 'tool', val: 6, status: 'LINKED', detail: 'Centralized secrets manager and PKI root CA for signing device firmware and storing symmetric encryption keys.' },
  { id: 'zeek', label: 'ZEEK', kind: 'tool', val: 6, status: 'LINKED', detail: 'Network security monitoring platform translating raw network traffic into structured JSON behavioral security logs.' },
  { id: 'metasploit', label: 'METASPLOIT', kind: 'tool', val: 6, status: 'LINKED', detail: 'Penetration testing platform executing authorized vulnerability verification scripts against IoT endpoints.' },
  { id: 'kibana', label: 'KIBANA SOC', kind: 'tool', val: 6, status: 'LINKED', detail: 'Real-time security information & event management (SIEM) dashboard for incident correlation and alert aggregation.' },
  { id: 'nmap-ot', label: 'NMAP OT', kind: 'tool', val: 6, status: 'LINKED', detail: 'Specialized port discovery tool with NSE scripts for probing BACnet, Modbus, and EtherNet/IP industrial ports.' },
];

const links: SeedLink[] = [
  // Core → Pillars
  { source: 'core', target: 'industrial-ot' }, { source: 'core', target: 'smart-bldg' },
  { source: 'core', target: 'net-edge' }, { source: 'core', target: 'health-iomt' },
  { source: 'core', target: 'automotive-v2x' },
  // Pillar → Agents/Tasks/Humans
  { source: 'industrial-ot', target: 'anomaly-ai' }, { source: 'industrial-ot', target: 'plc-audit' },
  { source: 'industrial-ot', target: 'ot-eng' }, { source: 'smart-bldg', target: 'tamper-ai' },
  { source: 'smart-bldg', target: 'port-scan' }, { source: 'smart-bldg', target: 'zero-trust' },
  { source: 'net-edge', target: 'firmware-ai' }, { source: 'net-edge', target: 'ota-patch' },
  { source: 'net-edge', target: 'pcap-stream' }, { source: 'health-iomt', target: 'pki-sentinel' },
  { source: 'health-iomt', target: 'mqtt-audit' }, { source: 'automotive-v2x', target: 'can-bus-ai' },
  { source: 'automotive-v2x', target: 'isolation' }, { source: 'automotive-v2x', target: 'soc-analyst' },
  // Agents/Tasks → Tools
  { source: 'anomaly-ai', target: 'suricata' }, { source: 'anomaly-ai', target: 'wireshark' },
  { source: 'plc-audit', target: 'nmap-ot' }, { source: 'ot-eng', target: 'kibana' },
  { source: 'tamper-ai', target: 'kibana' }, { source: 'port-scan', target: 'shodan' },
  { source: 'port-scan', target: 'nmap-ot' }, { source: 'zero-trust', target: 'vault' },
  { source: 'firmware-ai', target: 'shodan' }, { source: 'firmware-ai', target: 'metasploit' },
  { source: 'ota-patch', target: 'vault' }, { source: 'pcap-stream', target: 'zeek' },
  { source: 'pcap-stream', target: 'wireshark' }, { source: 'pki-sentinel', target: 'vault' },
  { source: 'mqtt-audit', target: 'zeek' }, { source: 'can-bus-ai', target: 'suricata' },
  { source: 'isolation', target: 'kibana' }, { source: 'soc-analyst', target: 'kibana' },
];

// ── Relationship type inference ────────────────────────────────────────────────

function inferRelType(sourceKind: string, targetKind: string): string {
  if (sourceKind === 'core' && targetKind === 'pillar') return 'COMMANDS';
  if (sourceKind === 'pillar' && ['agent', 'task', 'human'].includes(targetKind)) return 'OVERSEES';
  if (['agent', 'task', 'human'].includes(sourceKind) && targetKind === 'tool') return 'USES';
  return 'USES';
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Neo4j from embedded graph data...\n');
  console.log(`  📦 Entities to seed: ${nodes.length}`);

  // 1. MERGE all nodes with full properties
  console.log('  ⏳ Merging nodes into Neo4j...');
  try {
    await runQuery(
      `UNWIND $entities AS e
       MERGE (n:Entity {id: e.id})
       SET n.label = e.label,
           n.kind = e.kind,
           n.val = e.val,
           n.color = coalesce(e.color, ''),
           n.status = coalesce(e.status, ''),
           n.detail = coalesce(e.detail, '')`,
      {
        entities: nodes.map((n) => ({
          id: n.id, label: n.label, kind: n.kind, val: n.val,
          color: n.color ?? null, status: n.status ?? null, detail: n.detail ?? null,
        })),
      },
    );
    console.log('  ✅ All nodes merged');
  } catch (err) {
    console.error('  ❌ Node merge failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // 2. Build relationships
  const nodeKindMap = new Map(nodes.map((n) => [n.id, n.kind]));
  const rels = links.map((l) => ({
    sourceId: l.source,
    targetId: l.target,
    relType: inferRelType(nodeKindMap.get(l.source) ?? 'agent', nodeKindMap.get(l.target) ?? 'tool'),
  }));

  console.log(`  🔗 Relationships to seed: ${rels.length}`);

  // 3. MERGE relationships by type
  for (const relType of ['COMMANDS', 'OVERSEES', 'USES']) {
    const batch = rels.filter((r) => r.relType === relType);
    if (batch.length === 0) continue;

    console.log(`  ⏳ Merging ${relType} (${batch.length})...`);
    try {
      await runQuery(
        `UNWIND $rels AS rel
         MATCH (a:Entity {id: rel.sourceId})
         MATCH (b:Entity {id: rel.targetId})
         MERGE (a)-[:${relType}]->(b)`,
        { rels: batch.map((r) => ({ sourceId: r.sourceId, targetId: r.targetId })) },
      );
      console.log(`  ✅ ${relType}: ${batch.length} edges merged`);
    } catch (err) {
      console.error(`  ❌ ${relType} merge failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Summary
  console.log('\n🎉 Seed complete!');
  console.log(`   Neo4j: ${nodes.length} nodes, ${rels.length} relationships`);
  console.log(`   Types: COMMANDS=${rels.filter((r) => r.relType === 'COMMANDS').length}, OVERSEES=${rels.filter((r) => r.relType === 'OVERSEES').length}, USES=${rels.filter((r) => r.relType === 'USES').length}`);

  await closeDriver();
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
