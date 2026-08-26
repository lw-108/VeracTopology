import type { GraphNode, GraphLink } from '@/types/graph';

export const COLORS: Record<string, string> = {
  core: '#0f172a',
  pillar: '#7c3aed',
  agent: '#0284c7',
  task: '#64748b',
  tool: '#e11d48',
  human: '#d97706',
};

export const nodes: GraphNode[] = [
  // Core Engine
  { id: 'core', label: 'SOC CORE', kind: 'core', val: 24 },

  // Tier 1 — 5 IoT Security Pillars
  { id: 'industrial-ot', label: 'INDUSTRIAL OT', kind: 'pillar', val: 15, color: '#e11d48' },
  { id: 'smart-bldg', label: 'SMART BUILDINGS', kind: 'pillar', val: 15, color: '#d97706' },
  { id: 'net-edge', label: 'NETWORK EDGE', kind: 'pillar', val: 15, color: '#7c3aed' },
  { id: 'health-iomt', label: 'CONNECTED HEALTH', kind: 'pillar', val: 15, color: '#059669' },
  { id: 'automotive-v2x', label: 'AUTOMOTIVE V2X', kind: 'pillar', val: 15, color: '#0284c7' },

  // Tier 2 — Agents, Tasks & Security Humans
  // Under Industrial OT (SCADA / Smart Factory)
  { id: 'anomaly-ai', label: 'ANOMALY AI', kind: 'agent', val: 9 },
  { id: 'plc-audit', label: 'PLC AUDIT', kind: 'task', val: 8 },
  { id: 'ot-eng', label: 'OT SEC ENG', kind: 'human', val: 8, color: '#d97706' },

  // Under Smart Buildings (BMS / Access Control)
  { id: 'tamper-ai', label: 'TAMPER AI', kind: 'agent', val: 9 },
  { id: 'port-scan', label: 'PORT SCAN', kind: 'task', val: 8 },
  { id: 'zero-trust', label: 'ZERO TRUST', kind: 'agent', val: 8 },

  // Under Network Edge (Gateways / Firewalls / Routers)
  { id: 'firmware-ai', label: 'FIRMWARE AI', kind: 'agent', val: 9 },
  { id: 'ota-patch', label: 'OTA PATCH', kind: 'task', val: 8 },
  { id: 'pcap-stream', label: 'PCAP STREAM', kind: 'task', val: 8 },

  // Under Connected Health (IoMT / Medical)
  { id: 'pki-sentinel', label: 'PKI SENTINEL', kind: 'agent', val: 9 },
  { id: 'mqtt-audit', label: 'MQTT AUDIT', kind: 'task', val: 8 },

  // Under Automotive V2X (Connected Vehicles / CAN Bus)
  { id: 'can-bus-ai', label: 'CAN BUS AI', kind: 'agent', val: 9 },
  { id: 'isolation', label: 'ISOLATION', kind: 'task', val: 8 },
  { id: 'soc-analyst', label: 'SOC ANALYST', kind: 'human', val: 8, color: '#d97706' },

  // Tier 3 — Security Defense Tools
  { id: 'wireshark', label: 'WIRESHARK', kind: 'tool', val: 6 },
  { id: 'shodan', label: 'SHODAN', kind: 'tool', val: 6 },
  { id: 'suricata', label: 'SURICATA', kind: 'tool', val: 6 },
  { id: 'vault', label: 'VAULT', kind: 'tool', val: 6 },
  { id: 'zeek', label: 'ZEEK', kind: 'tool', val: 6 },
  { id: 'metasploit', label: 'METASPLOIT', kind: 'tool', val: 6 },
  { id: 'kibana', label: 'KIBANA SOC', kind: 'tool', val: 6 },
  { id: 'nmap-ot', label: 'NMAP OT', kind: 'tool', val: 6 },
];

export const links: GraphLink[] = [
  // Core to Pillars
  { source: 'core', target: 'industrial-ot' },
  { source: 'core', target: 'smart-bldg' },
  { source: 'core', target: 'net-edge' },
  { source: 'core', target: 'health-iomt' },
  { source: 'core', target: 'automotive-v2x' },

  // Industrial OT Branch
  { source: 'industrial-ot', target: 'anomaly-ai' },
  { source: 'industrial-ot', target: 'plc-audit' },
  { source: 'industrial-ot', target: 'ot-eng' },

  // Smart Buildings Branch
  { source: 'smart-bldg', target: 'tamper-ai' },
  { source: 'smart-bldg', target: 'port-scan' },
  { source: 'smart-bldg', target: 'zero-trust' },

  // Network Edge Branch
  { source: 'net-edge', target: 'firmware-ai' },
  { source: 'net-edge', target: 'ota-patch' },
  { source: 'net-edge', target: 'pcap-stream' },

  // Connected Health Branch
  { source: 'health-iomt', target: 'pki-sentinel' },
  { source: 'health-iomt', target: 'mqtt-audit' },

  // Automotive V2X Branch
  { source: 'automotive-v2x', target: 'can-bus-ai' },
  { source: 'automotive-v2x', target: 'isolation' },
  { source: 'automotive-v2x', target: 'soc-analyst' },

  // Tools connections
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

export interface NodeMeta {
  id: string;
  label: string;
  kind: string;
  status: string;
  detail: string;
}

export const nodeMeta: Record<string, NodeMeta> = {
  core: {
    id: 'core',
    label: 'SOC CORE KERNEL',
    kind: 'core',
    status: 'ARMED / ONLINE',
    detail: 'Central IoT Threat Command Kernel. Orchestrates network-wide telemetry, coordinates AI security sentinels, enforces Zero Trust microsegmentation, and executes automated threat containment.'
  },

  // Pillars
  'industrial-ot': {
    id: 'industrial-ot',
    label: 'INDUSTRIAL OT SECTOR',
    kind: 'pillar',
    status: 'PROTECTED',
    detail: 'Operational Technology & SCADA defense layer. Monitors factory floor sensors, Modbus/OPC-UA industrial protocols, and Programmable Logic Controller (PLC) integrity.'
  },
  'smart-bldg': {
    id: 'smart-bldg',
    label: 'SMART BUILDINGS SECTOR',
    kind: 'pillar',
    status: 'MONITORED',
    detail: 'Building Management System (BMS) security. Safeguards IP cameras, HVAC sensors, smart locks, and access control hardware from unauthorized network intrusions.'
  },
  'net-edge': {
    id: 'net-edge',
    label: 'NETWORK EDGE SECTOR',
    kind: 'pillar',
    status: 'ACTIVE DEFENSE',
    detail: '5G Gateway & Network Edge perimeter. Manages edge router firewalls, Deep Packet Inspection (DPI), and secure over-the-air firmware update streams.'
  },
  'health-iomt': {
    id: 'health-iomt',
    label: 'CONNECTED HEALTH SECTOR',
    kind: 'pillar',
    status: 'HIPAA ENCRYPTED',
    detail: 'Internet of Medical Things (IoMT) security. Enforces end-to-end cryptographic integrity for patient monitors, infusion pumps, and hospital telemetry networks.'
  },
  'automotive-v2x': {
    id: 'automotive-v2x',
    label: 'AUTOMOTIVE V2X SECTOR',
    kind: 'pillar',
    status: 'CAN SHIELD LIVE',
    detail: 'Vehicle-to-Everything (V2X) telematics security. Shields in-vehicle CAN bus architecture and ECU microcontrollers against remote exploit attempts.'
  },

  // Agents
  'anomaly-ai': {
    id: 'anomaly-ai',
    label: 'ANOMALY SENTINEL AI',
    kind: 'agent',
    status: 'SCANNING (100k pps)',
    detail: 'Machine learning neural model inspecting OT packet flows for anomalous Modbus payload signatures and timing attacks.'
  },
  'plc-audit': {
    id: 'plc-audit',
    label: 'PLC INTEGRITY CHECK',
    kind: 'task',
    status: 'RUNNING',
    detail: 'Continuous ladder-logic checksum validation. Detects rogue firmware injection or unauthorized PLC register modifications.'
  },
  'ot-eng': {
    id: 'ot-eng',
    label: 'LEAD OT SEC ENG',
    kind: 'human',
    status: 'ON-CALL (TIER 3)',
    detail: 'Human OT security engineer authorized to issue physical air-gap isolations and emergency SCADA overrides.'
  },

  'tamper-ai': {
    id: 'tamper-ai',
    label: 'PHYSICAL TAMPER AI',
    kind: 'agent',
    status: 'ARMED',
    detail: 'Computer vision and optical sensor agent detecting physical enclosure opening, optical sensor blinding, or pin-tamper attempts on smart devices.'
  },
  'port-scan': {
    id: 'port-scan',
    label: 'ROGUE DEVICE SWEEP',
    kind: 'task',
    status: 'SCHEDULED (1m)',
    detail: 'Automated network scan identifying unauthenticated rogue Wi-Fi/Bluetooth IoT nodes plugged into corporate building subnets.'
  },
  'zero-trust': {
    id: 'zero-trust',
    label: 'ZERO TRUST ENGINE',
    kind: 'agent',
    status: 'ACTIVE ENFORCER',
    detail: 'Dynamically authenticates IoT device certificates and dynamically isolates compromised MAC addresses into quarantine VLANs.'
  },

  'firmware-ai': {
    id: 'firmware-ai',
    label: 'FIRMWARE CVE SCANNER',
    kind: 'agent',
    status: 'ANALYZING',
    detail: 'Cross-references edge device firmware binaries against the NIST NVD database to surface zero-day vulnerabilities prior to exploit.'
  },
  'ota-patch': {
    id: 'ota-patch',
    label: 'OTA PATCH PIPELINE',
    kind: 'task',
    status: 'QUEUED',
    detail: 'Cryptographically signed Over-The-Air firmware deployment pipeline targeting gateway clusters.'
  },
  'pcap-stream': {
    id: 'pcap-stream',
    label: 'DPI PCAP STREAM',
    kind: 'task',
    status: 'RECORDING',
    detail: 'Full packet capture and real-time protocol breakdown for suspicious edge gateway traffic.'
  },

  'pki-sentinel': {
    id: 'pki-sentinel',
    label: 'PKI MESH AGENT',
    kind: 'agent',
    status: 'KEYS SYNCED',
    detail: 'Manages automated mTLS X.509 certificate issuance, short-lived key rotation, and hardware security module (HSM) pairing for medical devices.'
  },
  'mqtt-audit': {
    id: 'mqtt-audit',
    label: 'MQTT / COAP INSPECTOR',
    kind: 'task',
    status: 'PASSING',
    detail: 'Validates encrypted MQTT topic subscription permissions and rate-limits publish bursts to mitigate DDoS attacks.'
  },

  'can-bus-ai': {
    id: 'can-bus-ai',
    label: 'CAN BUS IPS AI',
    kind: 'agent',
    status: 'SHIELD ACTIVE',
    detail: 'In-vehicle Intrusion Prevention System. Filters spoofed CAN arbitration IDs and blocks unauthorized OBD-II diagnostic injection.'
  },
  'isolation': {
    id: 'isolation',
    label: 'AUTOMATED QUARANTINE',
    kind: 'task',
    status: 'STANDBY',
    detail: 'Instant network kill-switch task that drops BGP routes and isolates compromised vehicle telematics units.'
  },
  'soc-analyst': {
    id: 'soc-analyst',
    label: 'SOC THREAT HUNTER',
    kind: 'human',
    status: 'ACTIVE MONITOR',
    detail: 'Senior Cybersecurity Operations Center analyst reviewing correlated IoT threat vectors and approving mitigation playbooks.'
  },

  // Security Tools
  wireshark: {
    id: 'wireshark',
    label: 'WIRESHARK DPI',
    kind: 'tool',
    status: 'LINKED',
    detail: 'Industry-standard protocol analyzer capturing raw 802.15.4, Zigbee, and Ethernet frames for forensic inspection.'
  },
  shodan: {
    id: 'shodan',
    label: 'SHODAN RECON',
    kind: 'tool',
    status: 'LINKED',
    detail: 'External attack surface monitoring engine feeding exposure data for publicly accessible IoT IP addresses.'
  },
  suricata: {
    id: 'suricata',
    label: 'SURICATA IDS/IPS',
    kind: 'tool',
    status: 'LINKED',
    detail: 'High-speed network threat detection engine matching signature rules for IoT botnets like Mirai and Mozi.'
  },
  vault: {
    id: 'vault',
    label: 'HASHICORP VAULT',
    kind: 'tool',
    status: 'LINKED',
    detail: 'Centralized secrets manager and PKI root CA for signing device firmware and storing symmetric encryption keys.'
  },
  zeek: {
    id: 'zeek',
    label: 'ZEEK NSM',
    kind: 'tool',
    status: 'LINKED',
    detail: 'Network security monitoring platform translating raw network traffic into structured JSON behavioral security logs.'
  },
  metasploit: {
    id: 'metasploit',
    label: 'METASPLOIT SUITE',
    kind: 'tool',
    status: 'LINKED',
    detail: 'Penetration testing platform executing authorized vulnerability verification scripts against IoT endpoints.'
  },
  kibana: {
    id: 'kibana',
    label: 'KIBANA SIEM',
    kind: 'tool',
    status: 'LINKED',
    detail: 'Real-time security information & event management (SIEM) dashboard for incident correlation and alert aggregation.'
  },
  'nmap-ot': {
    id: 'nmap-ot',
    label: 'NMAP SCADA SCANNER',
    kind: 'tool',
    status: 'LINKED',
    detail: 'Specialized port discovery tool with NSE scripts for probing BACnet, Modbus, and EtherNet/IP industrial ports.'
  },
};

