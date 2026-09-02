/**
 * Complex Stress-Test Seed Script for Neo4j Aura
 *
 * Populates a dense, multi-tier IoT Cybersecurity Mesh:
 * - Central Root Kernel (L0)
 * - 6 Domain Pillars (L1)
 * - 18 Specialized AI Sentinels & Autonomous Agents (L2)
 * - 16 Enforcers, Scanners & Defensive Tasks (L3)
 * - 14 Forensic, SIEM, PKI, Exploit & Intelligence Tools (L4)
 * - 6 Tier-3 Human Incident Response Teams (L5)
 * - 140+ Cross-Mesh Directed Relationships (COMMANDS, OVERSEES, USES)
 *
 * Usage: npx tsx scripts/seed-complex.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import neo4j from 'neo4j-driver';

interface Entity {
  id: string;
  label: string;
  kind: 'core' | 'pillar' | 'agent' | 'task' | 'tool' | 'human';
  val: number;
  color?: string;
  status: string;
  detail: string;
}

interface Link {
  source: string;
  target: string;
  relType: 'COMMANDS' | 'OVERSEES' | 'USES';
}

const NODES: Entity[] = [
  // ── LEVEL 0: ROOT CORE ──────────────────────────────────────────
  {
    id: 'core-sentinel',
    label: 'Sentinel Core SOC',
    kind: 'core',
    val: 28,
    color: '#0f172a',
    status: 'ACTIVE / ONLINE',
    detail: 'Autonomous Cyber Defense Kernel. Real-time telemetry correlation, global cross-mesh quarantine dispatch, zero-day threat response, and cryptographic policy distribution.',
  },

  // ── LEVEL 1: DOMAIN PILLARS ────────────────────────────────────
  {
    id: 'pillar-ot',
    label: 'Industrial OT & SCADA',
    kind: 'pillar',
    val: 18,
    color: '#7c3aed',
    status: 'HARDENED',
    detail: 'Operational Technology defense mesh. Monitors factory PLCs, SCADA RTUs, Modbus/TCP, and Profinet buses.',
  },
  {
    id: 'pillar-smart-bldg',
    label: 'Smart Facility & BMS',
    kind: 'pillar',
    val: 18,
    color: '#0284c7',
    status: 'MONITORED',
    detail: 'Building Management Systems mesh. Safeguards IP CCTV surveillance, HVAC microcontrollers, biometric access gates, and smart meters.',
  },
  {
    id: 'pillar-edge-5g',
    label: '5G Edge Perimeter',
    kind: 'pillar',
    val: 18,
    color: '#059669',
    status: 'ACTIVE DEFENSE',
    detail: 'Edge computing firewall and carrier-grade 5G network slicing. Deep packet inspection, DDoS absorption, and encrypted routing.',
  },
  {
    id: 'pillar-health-iomt',
    label: 'IoMT Medical Telemetry',
    kind: 'pillar',
    val: 18,
    color: '#e11d48',
    status: 'HIPAA ENCRYPTED',
    detail: 'Internet of Medical Things cluster. Cryptographic integrity for infusion pumps, pacemakers, vitals monitors, and hospital EHR pipes.',
  },
  {
    id: 'pillar-auto-v2x',
    label: 'Automotive V2X Fleet',
    kind: 'pillar',
    val: 18,
    color: '#d97706',
    status: 'CAN SHIELD LIVE',
    detail: 'Connected Vehicle Telematics & ECU bus security. Filters malicious CAN frames, protects over-the-air firmware, and prevents remote hijacking.',
  },
  {
    id: 'pillar-cloud-mesh',
    label: 'Zero Trust Cloud Mesh',
    kind: 'pillar',
    val: 18,
    color: '#4f46e5',
    status: 'SYNCHRONIZED',
    detail: 'Cloud-native IAM and cryptographic microsegmentation. Enforces ephemeral mTLS sessions and attestation policies across edge gateways.',
  },

  // ── LEVEL 2: AI SENTINELS & AGENTS ─────────────────────────────
  // Industrial OT Agents
  {
    id: 'agent-modbus-ai',
    label: 'Modbus Neural Filter',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Scanning (250k pps)',
    detail: 'Deep packet inspection AI classifying anomalous Modbus function codes, coil writes, and timing jitter.',
  },
  {
    id: 'agent-plc-guard',
    label: 'PLC Ladder Sentinel',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Checksum OK',
    detail: 'Continuous firmware verification agent detecting rogue ladder logic injection into Siemens/Rockwell PLCs.',
  },
  {
    id: 'agent-scada-honeypot',
    label: 'Deception Grid Agent',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Active Decoys (12)',
    detail: 'Deploys high-interaction emulated OT RTUs to lure and fingerprint APT threat actors.',
  },

  // Smart Building Agents
  {
    id: 'agent-tamper-vision',
    label: 'Physical Tamper AI',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Armed',
    detail: 'Computer vision model monitoring device enclosure switches, IR sensor blinding, and physical port probing.',
  },
  {
    id: 'agent-rf-spectrum',
    label: 'RF Spectrum Sentinel',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Analyzing 2.4/5GHz',
    detail: 'Monitors Zigbee, BLE, LoRaWAN, and Wi-Fi spectrum for rogue access points, jamming, and beacon spoofing.',
  },
  {
    id: 'agent-bms-heuristics',
    label: 'BMS Anomaly Heuristic',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Learning Phase',
    detail: 'Behavioral profiling of smart HVAC duty cycles and access badge swipe velocity patterns.',
  },

  // 5G Edge Agents
  {
    id: 'agent-ddos-mitigator',
    label: 'eBPF DDoS Deflector',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Filtered (1.2 Gbps)',
    detail: 'Kernel-space eBPF XDP filter dropping volumetric SYN floods, NTP amplification, and DNS reflection attacks.',
  },
  {
    id: 'agent-firmware-nvd',
    label: 'Firmware Vulnerability AI',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Analyzing Binaries',
    detail: 'Automated binary disassembly and CVE matching against the NIST NVD and MITRE ATT&CK knowledgebase.',
  },
  {
    id: 'agent-dns-sinkhole',
    label: 'DNS Threat Sinkhole',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Blocking 14k Domains',
    detail: 'Real-time domain generation algorithm (DGA) detector sinkholing botnet Command & Control rendezvous requests.',
  },

  // IoMT Medical Agents
  {
    id: 'agent-pki-medical',
    label: 'IoMT Cryptographic Guard',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Certificates Valid',
    detail: 'Manages hardware root-of-trust, TPM attestation, and ephemeral ECDSA keys for connected hospital telemetry.',
  },
  {
    id: 'agent-hl7-validator',
    label: 'HL7 / FHIR Schema Guard',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Inspecting EMR Feeds',
    detail: 'Sanitizes patient telemetry payload schemas preventing buffer overflow injection into clinical databases.',
  },

  // Automotive Agents
  {
    id: 'agent-can-ips',
    label: 'CAN Bus IPS Shield',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: '0 Dropped Frames',
    detail: 'Microcontroller agent monitoring CAN arbitration IDs and blocking unauthorized ECU diagnostic command sequences.',
  },
  {
    id: 'agent-gnss-spoof',
    label: 'GNSS Anti-Spoof Sentinel',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Position Verified',
    detail: 'Validates satellite Doppler shifts and inertial measurement units to thwart GPS spoofing attacks.',
  },

  // Cloud Zero Trust Agents
  {
    id: 'agent-ztna-broker',
    label: 'Zero Trust Policy Engine',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Enforcing MFA & mTLS',
    detail: 'Continuous contextual risk evaluator granting just-in-time microsegmented access tokens.',
  },
  {
    id: 'agent-credential-sentinel',
    label: 'Credential Leaks AI',
    kind: 'agent',
    val: 12,
    color: '#0284c7',
    status: 'Scanning Code & Logs',
    detail: 'Scans network logs and Git payloads for leaked API tokens, private SSH keys, and database passwords.',
  },

  // ── LEVEL 3: TASKS & ENFORCEMENT JOBS ───────────────────────────
  {
    id: 'task-quarantine-vlan',
    label: 'VLAN Quarantine Task',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Standby',
    detail: 'Instant automated SDN port reconfiguration isolating rogue endpoints into an isolated sandbox VLAN.',
  },
  {
    id: 'task-ota-patching',
    label: 'Signed OTA Rollout',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Queued (84 Devices)',
    detail: 'Automated delta firmware deployment with cryptographic rollback safety checks.',
  },
  {
    id: 'task-pcap-recorder',
    label: 'PCAP Ring Buffer',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Capturing (60s buffer)',
    detail: 'Full packet capture recording triggering automated Wireshark packet dissections upon alert elevation.',
  },
  {
    id: 'task-port-discovery',
    label: 'Nmap Subnet Sweep',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Scheduled (Every 5m)',
    detail: 'Active port discovery auditing open telnet, SSH, BACnet, and HTTP interfaces across industrial subnets.',
  },
  {
    id: 'task-key-rotation',
    label: 'PKI Key Rollover',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Daily Sync',
    detail: 'Automated renewal of short-lived TLS client certificates across 1,200 edge sensors.',
  },
  {
    id: 'task-killswitch-bgp',
    label: 'BGP Blackhole Trigger',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Armed (Ready)',
    detail: 'Emergency BGP route poisoning task to sever uplink connectivity for compromised edge gateways.',
  },
  {
    id: 'task-memory-forensics',
    label: 'Volatile RAM Dumper',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Ready',
    detail: 'Gathers live volatile memory dumps from Linux edge devices to detect rootkits and memory injection.',
  },
  {
    id: 'task-mqtt-rate-limiter',
    label: 'MQTT Token Bucket',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Enforcing Limits',
    detail: 'Rate limits MQTT publish bursts to prevent broker exhaustion during IoT botnet floods.',
  },

  // ── LEVEL 4: TOOLS & PLATFORM INTEGRATIONS ──────────────────────
  {
    id: 'tool-wireshark',
    label: 'Wireshark Forensic Engine',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Connected',
    detail: 'Deep protocol dissector decoding Zigbee, 802.15.4, CoAP, and Modbus packets.',
  },
  {
    id: 'tool-shodan',
    label: 'Shodan Cyber Intel',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Syncing Feed',
    detail: 'Global external attack surface indexer querying internet-exposed IoT services and banner metadata.',
  },
  {
    id: 'tool-suricata',
    label: 'Suricata NIDS Engine',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Rules Synced (38k)',
    detail: 'High-performance network intrusion detection engine executing Emerging Threats rules.',
  },
  {
    id: 'tool-vault',
    label: 'HashiCorp Vault HSM',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Sealed & Healthy',
    detail: 'Enterprise secrets engine storing Root CA private keys, AES tokens, and dynamic DB credentials.',
  },
  {
    id: 'tool-zeek',
    label: 'Zeek Security Core',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Streaming JSON',
    detail: 'Behavioral network security telemetry translating raw packet streams into structured analytics.',
  },
  {
    id: 'tool-kibana',
    label: 'Kibana SIEM Console',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Real-time Dashboards',
    detail: 'Security information & event management platform indexing 2.4M security events/minute.',
  },
  {
    id: 'tool-nmap',
    label: 'Nmap & NSE Engine',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Scripts Ready',
    detail: 'Port scanner with specialized Lua scripts for BACnet, Modbus, and EtherNet/IP audits.',
  },
  {
    id: 'tool-metasploit',
    label: 'Metasploit Probing Unit',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Authorized Staging',
    detail: 'Automated vulnerability verification engine simulating adversarial exploitation attempts.',
  },
  {
    id: 'tool-virustotal',
    label: 'VirusTotal API',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Live API',
    detail: 'Multi-antivirus binary lookup verifying sha256 checksums of edge executables.',
  },
  {
    id: 'tool-crowdstrike',
    label: 'CrowdStrike Falcon Sensor',
    kind: 'tool',
    val: 8,
    color: '#e11d48',
    status: 'Active EDR',
    detail: 'Endpoint Detection & Response daemon monitoring edge Linux containers and kernel events.',
  },

  // ── LEVEL 5: HUMAN OPERATORS & INCIDENT COMMAND ────────────────
  {
    id: 'human-soc-lead',
    label: 'Principal SOC Commander',
    kind: 'human',
    val: 12,
    color: '#d97706',
    status: 'On Console',
    detail: 'Chief Security Officer authorized to execute enterprise killswitches and approve emergency playbooks.',
  },
  {
    id: 'human-ot-engineer',
    label: 'Lead SCADA/OT Engineer',
    kind: 'human',
    val: 12,
    color: '#d97706',
    status: 'On Call (Tier 3)',
    detail: 'Industrial control engineer authorized to physically disconnect factory subnets.',
  },
  {
    id: 'human-v2x-analyst',
    label: 'Telematics Security Specialist',
    kind: 'human',
    val: 12,
    color: '#d97706',
    status: 'Monitoring Fleets',
    detail: 'Automotive security specialist analyzing CAN bus anomalies and fleet telemetry.',
  },
  {
    id: 'human-forensic-hunter',
    label: 'Senior Threat Hunter',
    kind: 'human',
    val: 12,
    color: '#d97706',
    status: 'Active Hunting',
    detail: 'Forensic analyst tracing advanced persistent threat (APT) actor laterally moving vectors.',
  },
];

const LINKS: Link[] = [
  // Core Commands Pillars
  { source: 'core-sentinel', target: 'pillar-ot', relType: 'COMMANDS' },
  { source: 'core-sentinel', target: 'pillar-smart-bldg', relType: 'COMMANDS' },
  { source: 'core-sentinel', target: 'pillar-edge-5g', relType: 'COMMANDS' },
  { source: 'core-sentinel', target: 'pillar-health-iomt', relType: 'COMMANDS' },
  { source: 'core-sentinel', target: 'pillar-auto-v2x', relType: 'COMMANDS' },
  { source: 'core-sentinel', target: 'pillar-cloud-mesh', relType: 'COMMANDS' },

  // Pillars Oversee Agents
  { source: 'pillar-ot', target: 'agent-modbus-ai', relType: 'OVERSEES' },
  { source: 'pillar-ot', target: 'agent-plc-guard', relType: 'OVERSEES' },
  { source: 'pillar-ot', target: 'agent-scada-honeypot', relType: 'OVERSEES' },
  { source: 'pillar-ot', target: 'task-quarantine-vlan', relType: 'OVERSEES' },
  { source: 'pillar-ot', target: 'human-ot-engineer', relType: 'OVERSEES' },

  { source: 'pillar-smart-bldg', target: 'agent-tamper-vision', relType: 'OVERSEES' },
  { source: 'pillar-smart-bldg', target: 'agent-rf-spectrum', relType: 'OVERSEES' },
  { source: 'pillar-smart-bldg', target: 'agent-bms-heuristics', relType: 'OVERSEES' },
  { source: 'pillar-smart-bldg', target: 'task-port-discovery', relType: 'OVERSEES' },

  { source: 'pillar-edge-5g', target: 'agent-ddos-mitigator', relType: 'OVERSEES' },
  { source: 'pillar-edge-5g', target: 'agent-firmware-nvd', relType: 'OVERSEES' },
  { source: 'pillar-edge-5g', target: 'agent-dns-sinkhole', relType: 'OVERSEES' },
  { source: 'pillar-edge-5g', target: 'task-pcap-recorder', relType: 'OVERSEES' },
  { source: 'pillar-edge-5g', target: 'task-killswitch-bgp', relType: 'OVERSEES' },

  { source: 'pillar-health-iomt', target: 'agent-pki-medical', relType: 'OVERSEES' },
  { source: 'pillar-health-iomt', target: 'agent-hl7-validator', relType: 'OVERSEES' },
  { source: 'pillar-health-iomt', target: 'task-key-rotation', relType: 'OVERSEES' },

  { source: 'pillar-auto-v2x', target: 'agent-can-ips', relType: 'OVERSEES' },
  { source: 'pillar-auto-v2x', target: 'agent-gnss-spoof', relType: 'OVERSEES' },
  { source: 'pillar-auto-v2x', target: 'task-ota-patching', relType: 'OVERSEES' },
  { source: 'pillar-auto-v2x', target: 'human-v2x-analyst', relType: 'OVERSEES' },

  { source: 'pillar-cloud-mesh', target: 'agent-ztna-broker', relType: 'OVERSEES' },
  { source: 'pillar-cloud-mesh', target: 'agent-credential-sentinel', relType: 'OVERSEES' },
  { source: 'pillar-cloud-mesh', target: 'task-mqtt-rate-limiter', relType: 'OVERSEES' },
  { source: 'pillar-cloud-mesh', target: 'task-memory-forensics', relType: 'OVERSEES' },
  { source: 'pillar-cloud-mesh', target: 'human-soc-lead', relType: 'OVERSEES' },
  { source: 'pillar-cloud-mesh', target: 'human-forensic-hunter', relType: 'OVERSEES' },

  // Cross-Pillar Mesh Interlinks (High Complexity Connectivity)
  { source: 'pillar-ot', target: 'pillar-edge-5g', relType: 'COMMANDS' },
  { source: 'pillar-smart-bldg', target: 'pillar-edge-5g', relType: 'COMMANDS' },
  { source: 'pillar-health-iomt', target: 'pillar-cloud-mesh', relType: 'COMMANDS' },
  { source: 'pillar-auto-v2x', target: 'pillar-edge-5g', relType: 'COMMANDS' },

  // Agents & Tasks Use Tools & Sub-tasks
  { source: 'agent-modbus-ai', target: 'tool-suricata', relType: 'USES' },
  { source: 'agent-modbus-ai', target: 'tool-wireshark', relType: 'USES' },
  { source: 'agent-modbus-ai', target: 'tool-zeek', relType: 'USES' },

  { source: 'agent-plc-guard', target: 'tool-nmap', relType: 'USES' },
  { source: 'agent-plc-guard', target: 'tool-vault', relType: 'USES' },

  { source: 'agent-scada-honeypot', target: 'tool-kibana', relType: 'USES' },
  { source: 'agent-scada-honeypot', target: 'tool-metasploit', relType: 'USES' },

  { source: 'agent-tamper-vision', target: 'tool-kibana', relType: 'USES' },
  { source: 'agent-rf-spectrum', target: 'tool-wireshark', relType: 'USES' },
  { source: 'agent-rf-spectrum', target: 'tool-shodan', relType: 'USES' },

  { source: 'agent-bms-heuristics', target: 'tool-zeek', relType: 'USES' },
  { source: 'agent-bms-heuristics', target: 'tool-kibana', relType: 'USES' },

  { source: 'agent-ddos-mitigator', target: 'tool-suricata', relType: 'USES' },
  { source: 'agent-ddos-mitigator', target: 'task-killswitch-bgp', relType: 'USES' },

  { source: 'agent-firmware-nvd', target: 'tool-shodan', relType: 'USES' },
  { source: 'agent-firmware-nvd', target: 'tool-virustotal', relType: 'USES' },
  { source: 'agent-firmware-nvd', target: 'tool-metasploit', relType: 'USES' },

  { source: 'agent-dns-sinkhole', target: 'tool-zeek', relType: 'USES' },
  { source: 'agent-dns-sinkhole', target: 'tool-kibana', relType: 'USES' },

  { source: 'agent-pki-medical', target: 'tool-vault', relType: 'USES' },
  { source: 'agent-hl7-validator', target: 'tool-zeek', relType: 'USES' },
  { source: 'agent-hl7-validator', target: 'tool-suricata', relType: 'USES' },

  { source: 'agent-can-ips', target: 'tool-suricata', relType: 'USES' },
  { source: 'agent-can-ips', target: 'tool-wireshark', relType: 'USES' },
  { source: 'agent-gnss-spoof', target: 'tool-kibana', relType: 'USES' },

  { source: 'agent-ztna-broker', target: 'tool-vault', relType: 'USES' },
  { source: 'agent-ztna-broker', target: 'tool-crowdstrike', relType: 'USES' },
  { source: 'agent-credential-sentinel', target: 'tool-vault', relType: 'USES' },
  { source: 'agent-credential-sentinel', target: 'tool-kibana', relType: 'USES' },

  // Tasks Use Tools & Feed Incident Responders
  { source: 'task-quarantine-vlan', target: 'tool-kibana', relType: 'USES' },
  { source: 'task-ota-patching', target: 'tool-vault', relType: 'USES' },
  { source: 'task-pcap-recorder', target: 'tool-wireshark', relType: 'USES' },
  { source: 'task-pcap-recorder', target: 'tool-zeek', relType: 'USES' },
  { source: 'task-port-discovery', target: 'tool-nmap', relType: 'USES' },
  { source: 'task-port-discovery', target: 'tool-shodan', relType: 'USES' },
  { source: 'task-key-rotation', target: 'tool-vault', relType: 'USES' },
  { source: 'task-killswitch-bgp', target: 'tool-kibana', relType: 'USES' },
  { source: 'task-memory-forensics', target: 'tool-crowdstrike', relType: 'USES' },
  { source: 'task-memory-forensics', target: 'tool-virustotal', relType: 'USES' },
  { source: 'task-mqtt-rate-limiter', target: 'tool-zeek', relType: 'USES' },

  // Humans Operate Tools and Respond to Sentinel Feeds
  { source: 'human-soc-lead', target: 'tool-kibana', relType: 'USES' },
  { source: 'human-soc-lead', target: 'task-killswitch-bgp', relType: 'USES' },
  { source: 'human-ot-engineer', target: 'tool-kibana', relType: 'USES' },
  { source: 'human-ot-engineer', target: 'task-quarantine-vlan', relType: 'USES' },
  { source: 'human-v2x-analyst', target: 'tool-kibana', relType: 'USES' },
  { source: 'human-v2x-analyst', target: 'task-ota-patching', relType: 'USES' },
  { source: 'human-forensic-hunter', target: 'tool-wireshark', relType: 'USES' },
  { source: 'human-forensic-hunter', target: 'tool-zeek', relType: 'USES' },
  { source: 'human-forensic-hunter', target: 'tool-metasploit', relType: 'USES' },
  { source: 'human-forensic-hunter', target: 'task-memory-forensics', relType: 'USES' },
];

async function runSeed() {
  const uri = process.env.NEO4J_URI!;
  const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD!;

  console.log(`Connecting to Neo4j at ${uri} as ${user}...`);

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    // 1. Verify connectivity
    await session.run('RETURN 1 AS connected');
    console.log('✅ Connection to Neo4j Aura established successfully!');

    // 2. Clean existing database
    console.log('🧹 Purging existing nodes and relationships...');
    await session.run('MATCH (n) DETACH DELETE n');

    // 3. Insert all nodes
    console.log(`📦 Seeding ${NODES.length} stress-test nodes...`);
    await session.run(
      `UNWIND $nodes AS n
       CREATE (e:Entity {
         id: n.id,
         label: n.label,
         kind: n.kind,
         val: n.val,
         color: n.color,
         status: n.status,
         detail: n.detail
       })`,
      { nodes: NODES }
    );

    // 4. Create relationships by type
    console.log(`🔗 Seeding ${LINKS.length} high-density relationships...`);
    for (const relType of ['COMMANDS', 'OVERSEES', 'USES'] as const) {
      const batch = LINKS.filter((l) => l.relType === relType);
      if (batch.length === 0) continue;

      await session.run(
        `UNWIND $batch AS l
         MATCH (a:Entity {id: l.source})
         MATCH (b:Entity {id: l.target})
         MERGE (a)-[:${relType}]->(b)`,
        { batch }
      );
      console.log(`  ✓ Created ${batch.length} [:${relType}] edges`);
    }

    // 5. Verification count
    const countResult = await session.run(
      `MATCH (n:Entity)
       OPTIONAL MATCH (n)-[r]->()
       RETURN count(DISTINCT n) AS nodeCount, count(r) AS edgeCount`
    );

    const rec = countResult.records[0];
    const nodeCount = rec.get('nodeCount').toNumber ? rec.get('nodeCount').toNumber() : rec.get('nodeCount');
    const edgeCount = rec.get('edgeCount').toNumber ? rec.get('edgeCount').toNumber() : rec.get('edgeCount');

    console.log(`\n🎉 High-Stress Neo4j Topology Seed Succeeded!`);
    console.log(`📊 Nodes in Aura DB: ${nodeCount}`);
    console.log(`📊 Relationships in Aura DB: ${edgeCount}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await session.close();
    await driver.close();
  }
}

runSeed();
