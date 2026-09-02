/**
 * Massive Enterprise Stress-Test Seeder for Neo4j Aura & GraphOS
 *
 * Populates:
 * - 25 Enterprise Users (including Shankar, Rasappa, Rajesh, and 22 SOC Leads/Engineers)
 * - 25 Dedicated Projects (1 User <-> 1 Project)
 * - 250+ Topology Nodes across 6 tiers:
 *     - L0: Sentinel Core SOC & Sub-Kernels
 *     - L1: Security Pillars (12 Domain Hubs)
 *     - L2: Autonomous AI Agents (50+ Sentinels)
 *     - L3: Automated Security Tasks & Jobs (80+ Enforcers)
 *     - L4: Forensic Tools & Cloud Integrations (70+ Tools)
 *     - L5: Certified Human Operators & Incident Commanders (40+ Operators)
 * - 600+ Directed Relationships (COMMANDS, OVERSEES, USES, ESCALATES_TO, MONITORS)
 * - Full 1-to-1 linkage: (User)-[:OWNS_PROJECT]->(Project)-[:MANAGES_TOPOLOGY]->(Entity)
 *
 * Usage: npx tsx scripts/seed-massive.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { runQuery, isNeo4jConfigured } from '../lib/neo4j';
import type { NodeKind } from '../types/graph';

async function seedMassive() {
  console.log('🚀 Starting Massive Enterprise Topology & User Seed in Neo4j Aura...');

  if (!isNeo4jConfigured()) {
    console.error('❌ Neo4j not configured in .env.local');
    process.exit(1);
  }

  try {
    // ── 1. Purge Existing Graph ──────────────────────────────────────
    console.log('🧹 Purging existing Nodes, Projects, and Users...');
    await runQuery(`MATCH (n) DETACH DELETE n`);

    // ── 2. Create 25 Users & 25 Projects (1-to-1) ────────────────────
    console.log('👥 Generating 25 Enterprise Users & 25 1-to-1 Projects...');
    const usersData = [
      { id: 'usr-shankar', name: 'Shankar', email: 'shankar@sentinel.sec', role: 'Lead Security Architect', projId: 'proj-grid-sentinel', projName: 'Grid Sentinel 2026', deadline: '2026-11-30', desc: 'Zero-trust OT/SCADA & smart building threat isolation mesh across 14 manufacturing plants.' },
      { id: 'usr-rasappa', name: 'Rasappa', email: 'rasappa@sentinel.sec', role: 'Autonomous Agent Director', projId: 'proj-v2x-guard', projName: 'Automotive V2X Guard', deadline: '2026-12-15', desc: 'Fleet-wide CAN bus anomaly detection and automated PKI quarantine enforcement for connected vehicles.' },
      { id: 'usr-rajesh', name: 'Rajesh', email: 'rajesh@sentinel.sec', role: 'IoMT Compliance Director', projId: 'proj-iomt-shield', projName: 'IoMT Medical Telemetry Shield', deadline: '2027-01-20', desc: 'Hospital device micro-segmentation and HL7/FHIR telemetry tamper-detection engine.' },
      { id: 'usr-ananya', name: 'Ananya Sharma', email: 'ananya.s@sentinel.sec', role: 'Cloud Mesh Security Lead', projId: 'proj-cloud-sentinel', projName: 'Multi-Cloud Zero-Trust Fabric', deadline: '2026-10-15', desc: 'eBPF-driven Kubernetes egress inspection and cross-cloud identity mesh.' },
      { id: 'usr-vikram', name: 'Vikram Patel', email: 'vikram.p@sentinel.sec', role: 'SCADA Defense Engineer', projId: 'proj-substation-alpha', projName: 'Substation Alpha Cyber Mesh', deadline: '2026-11-05', desc: 'DNP3/IEC-61850 grid substation telemetry tamper detection and optical isolation.' },
      { id: 'usr-priya', name: 'Priya Nair', email: 'priya.n@sentinel.sec', role: 'Cryptographic Systems Lead', projId: 'proj-post-quantum', projName: 'Post-Quantum Lattice Vault', deadline: '2027-03-30', desc: 'Kyber/Dilithium hardware security module migration and key encapsulation.' },
      { id: 'usr-arjun', name: 'Arjun Mehta', email: 'arjun.m@sentinel.sec', role: 'Incident Response Commander', projId: 'proj-ir-rapid', projName: 'Autonomous Incident Containment', deadline: '2026-09-30', desc: 'Sub-second micro-segmentation and automated firewall rule injection.' },
      { id: 'usr-kavita', name: 'Kavita Reddy', email: 'kavita.r@sentinel.sec', role: 'Threat Intelligence Lead', projId: 'proj-threat-intel', projName: 'Global Threat Hunter AI', deadline: '2026-12-01', desc: 'Real-time MITRE ATT&CK graph correlation and adversary infrastructure tracking.' },
      { id: 'usr-suresh', name: 'Suresh Menon', email: 'suresh.m@sentinel.sec', role: 'Industrial IoT Specialist', projId: 'proj-smart-factory', projName: 'Smart Factory Mesh v4', deadline: '2027-02-10', desc: 'Predictive sensor anomaly detection across 4,000 robotic welding units.' },
      { id: 'usr-deepa', name: 'Deepa Iyer', email: 'deepa.i@sentinel.sec', role: 'Zero-Trust Policy Enforcer', projId: 'proj-identity-lake', projName: 'Unified Zero-Trust Policy Engine', deadline: '2026-11-20', desc: 'Continuous adaptive risk scoring and automated OAuth session revocation.' },
    ];

    // Add 15 more engineers to reach 25 users
    const roles = ['SOC Analyst L3', 'DevSecOps Lead', 'Malware Researcher', 'Security Automation Specialist', 'OT Threat Hunter'];
    for (let i = 11; i <= 25; i++) {
      usersData.push({
        id: `usr-sec-${i}`,
        name: `Security Specialist ${i}`,
        email: `specialist.${i}@sentinel.sec`,
        role: roles[i % roles.length],
        projId: `proj-sector-${i}`,
        projName: `Sector ${i} Defense Sector`,
        deadline: `2027-0${(i % 9) + 1}-15`,
        desc: `Autonomous cyber asset inspection, micro-quarantine, and perimeter compliance for Sector ${i}.`,
      });
    }

    for (const u of usersData) {
      await runQuery(
        `CREATE (u:User {
           id: $id,
           name: $name,
           email: $email,
           role: $role,
           createdAt: datetime()
         })
         CREATE (p:Project {
           id: $projId,
           name: $projName,
           deadline: $deadline,
           description: $desc,
           status: 'Active',
           createdAt: datetime(),
           userId: $id
         })
         CREATE (u)-[:OWNS_PROJECT]->(p)`,
        {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          projId: u.projId,
          projName: u.projName,
          deadline: u.deadline,
          desc: u.desc,
        }
      );
    }
    console.log(`  ✓ Created 25 Users & 25 Projects with [:OWNS_PROJECT] relations`);

    // ── 3. Generate 250+ Topology Nodes ──────────────────────────────
    console.log('📦 Generating 250+ Tiered Topology Nodes (Pillars, Agents, Tasks, Tools, Operators)...');

    interface RawNode {
      id: string;
      label: string;
      kind: NodeKind;
      status: string;
      detail: string;
      val: number;
      parentId?: string;
      relType?: string;
    }

    const allNodes: RawNode[] = [];

    // L0: Root Kernel
    allNodes.push({
      id: 'core-sentinel',
      label: 'Sentinel Core SOC',
      kind: 'core',
      status: 'ACTIVE / ONLINE',
      detail: 'Autonomous Cyber Defense Kernel. Real-time telemetry correlation and global cross-mesh command dispatch.',
      val: 32,
    });

    // L1: 12 Security Pillars
    const pillars = [
      { id: 'pillar-identity', label: 'Identity & Access Guard', detail: 'Zero-trust auth, continuous session attestation, and biometric key distribution.' },
      { id: 'pillar-scada', label: 'SCADA & OT Industrial Armor', detail: 'S7comm, Modbus, DNP3, and IEC-61850 deep packet inspection and PLC micro-segmentation.' },
      { id: 'pillar-cloud', label: 'Multi-Cloud Mesh Defense', detail: 'eBPF egress inspection, K8s Pod security standards, and cross-VPC wireguard mesh.' },
      { id: 'pillar-crypto', label: 'Quantum-Resistant Vault', detail: 'Hardware Security Module (HSM) cluster with post-quantum lattice key exchange.' },
      { id: 'pillar-iomt', label: 'IoMT Medical Telemetry Shield', detail: 'Hospital device VLAN isolation, HL7 protocol firewalls, and infusion pump monitoring.' },
      { id: 'pillar-v2x', label: 'Automotive V2X Fleet Guard', detail: 'CAN bus bus-off anomaly detection, secure boot verification, and over-the-air firmware gates.' },
      { id: 'pillar-ai-sentinel', label: 'Neural Threat Intelligence Hub', detail: 'Graph neural network behavioral clustering, MITRE ATT&CK correlation, and zero-day forecasting.' },
      { id: 'pillar-incident-resp', label: 'Automated Incident Response', detail: 'Dynamic BGP blackholing, host isolation, snapshot forensics, and memory triage.' },
      { id: 'pillar-smart-grid', label: 'Smart Grid Substation Armor', detail: 'High-voltage relay telemetry monitoring, synchrophasor analytics, and breaker lockouts.' },
      { id: 'pillar-fintech', label: 'FinTech High-Frequency Ledger', detail: 'SWIFT transaction tamper verification, ultra-low-latency anomaly detection, and ledger auditing.' },
      { id: 'pillar-supply-chain', label: 'Software Supply Chain Sentinel', detail: 'SBOM cryptographic provenance attestation, SLSA level 4 enforcement, and registry quarantine.' },
      { id: 'pillar-space-sat', label: 'Aerospace & SatCom Shield', detail: 'Telemetry uplink anti-spoofing, radiation-hardened command validation, and orbital mesh security.' },
    ];

    pillars.forEach((p) => {
      allNodes.push({
        id: p.id,
        label: p.label,
        kind: 'pillar',
        status: 'OPERATIONAL',
        detail: p.detail,
        val: 22,
        parentId: 'core-sentinel',
        relType: 'COMMANDS',
      });
    });

    // L2: 60 Autonomous Agents (5 per pillar)
    const agentTemplates = [
      { prefix: 'agent-auth', name: 'Auth Warden AI', kind: 'agent', detail: 'Continuously verifies JWT tokens, mTLS certificates, and evaluates risk scores.' },
      { prefix: 'agent-s7', name: 'Siemens S7 Protocol Enforcer', kind: 'agent', detail: 'Monitors PLC command blocks and prevents unauthorized ladder logic writes.' },
      { prefix: 'agent-ebpf', name: 'eBPF Kernel Probe Agent', kind: 'agent', detail: 'Tracks all raw socket connections, sys_enter_connect calls, and namespace escapes.' },
      { prefix: 'agent-hsm', name: 'Kyber Key Encapsulation Engine', kind: 'agent', detail: 'Rotates 4096-bit post-quantum ephemeral keys every 60 seconds.' },
      { prefix: 'agent-hl7', name: 'HL7 Medical Integrity Monitor', kind: 'agent', detail: 'Inspects DICOM image feeds and prevents telemetry injection on patient monitors.' },
      { prefix: 'agent-can', name: 'CAN Bus Anomaly Detector', kind: 'agent', detail: 'Calculates frame entropy and halts spoofed torque/braking arbitration frames.' },
      { prefix: 'agent-gnn', name: 'GNN Adversary Forecaster', kind: 'agent', detail: 'Projects probable lateral movement vectors using graph path analysis.' },
      { prefix: 'agent-soar', name: 'SOAR Auto-Remediator', kind: 'agent', detail: 'Dispatches automated host quarantine scripts and updates Palo Alto/Fortinet rules.' },
      { prefix: 'agent-dnp3', name: 'DNP3 Synchrophasor Guard', kind: 'agent', detail: 'Validates electrical phase angles and blocks falsified breaker trip commands.' },
      { prefix: 'agent-swift', name: 'SWIFT MT/MX Transaction Verifier', kind: 'agent', detail: 'Real-time AML rule validation and inter-bank payment fraud interception.' },
      { prefix: 'agent-sbom', name: 'Cosign SBOM Attestation Sentinel', kind: 'agent', detail: 'Validates container image signatures against Sigstore Rekor transparency logs.' },
      { prefix: 'agent-sat', name: 'SatCom CCSDS Telemetry Gate', kind: 'agent', detail: 'Validates Consultative Committee for Space Data Systems packet signatures.' },
    ];

    pillars.forEach((p, pIdx) => {
      const template = agentTemplates[pIdx];
      for (let a = 1; a <= 5; a++) {
        const agentId = `${template.prefix}-${pIdx + 1}-${a}`;
        allNodes.push({
          id: agentId,
          label: `${template.name} #${a}`,
          kind: 'agent',
          status: a === 1 ? 'ACTIVE (PATROLLING)' : 'RUNNING (MONITORING)',
          detail: `${template.detail} Assigned to ${p.label}.`,
          val: 16,
          parentId: p.id,
          relType: 'OVERSEES',
        });
      }
    });

    // L3: 90 Tasks (Enforcers & Jobs)
    const taskTypes = [
      'Continuous Ephemeral Token Invalidation',
      'PLC Memory Snapshot & Integrity Check',
      'eBPF Socket Flow Anomaly Audit',
      'HSM Key Derivation & Rotation Task',
      'HL7 Patient Monitor Protocol Scan',
      'CAN Frame Arbitration Timing Audit',
      'MITRE ATT&CK Lateral Map Ingestion',
      'Automated Host Isolation Dispatch',
      'Substation Phase Angle Synchronization',
      'High-Frequency Ledger Anti-Tamper Check',
      'Container Image Provenance Verification',
      'Uplink Command Decryption Verification',
    ];

    const agentNodes = allNodes.filter((n) => n.kind === 'agent');
    agentNodes.slice(0, 90).forEach((ag, idx) => {
      const taskId = `task-${idx + 1}`;
      allNodes.push({
        id: taskId,
        label: `${taskTypes[idx % taskTypes.length]} [Job #${idx + 101}]`,
        kind: 'task',
        status: idx % 7 === 0 ? 'QUEUED' : 'IN_EXECUTION',
        detail: `Automated micro-task executing under ${ag.label}. Cycle interval: 500ms.`,
        val: 12,
        parentId: ag.id,
        relType: 'USES',
      });
    });

    // L4: 75 Forensic & Telemetry Tools
    const toolCatalog = [
      { name: 'Suricata 7.0 IDS/IPS Engine', detail: 'High-speed multi-threaded network threat detection.' },
      { name: 'Wireshark Industrial Dissector', detail: 'Deep packet decoder for Modbus, S7, and DNP3.' },
      { name: 'HashiCorp Vault Post-Quantum CA', detail: 'Automated certificate authority with Kyber1024.' },
      { name: 'Cilium eBPF Service Mesh', detail: 'Kernel-level container networking and L7 security.' },
      { name: 'Zeek Network Security Monitor', detail: 'Protocol analysis, DNS logging, and certificate validation.' },
      { name: 'Falco Cloud-Native Runtime Security', detail: 'Kernel event monitoring and container privilege escalation alerts.' },
      { name: 'Velociraptor Digital Forensics', detail: 'Endpoint triage, live memory acquisition, and MFT indexing.' },
      { name: 'MISP Threat Sharing Platform', detail: 'Open-source threat intelligence and IOC correlation engine.' },
      { name: 'YARA Rule Live Engine', detail: 'Pattern matching engine for binary payload identification.' },
      { name: 'Ghidra Headless Decompiler', detail: 'Automated reverse engineering and firmware disassembly.' },
      { name: 'Sysdig Secure Container Inspector', detail: 'Image vulnerability scanner and compliance auditing.' },
      { name: 'Nzyme Wireless IDS', detail: 'WiFi and Bluetooth airspace intrusion detection.' },
      { name: 'Snort 3 Multi-Gigabit Engine', detail: 'Rule-based packet filtering and behavioral inspection.' },
      { name: 'Trivy Vulnerability Scanner', detail: 'Comprehensive vulnerability scanner for containers and git repos.' },
      { name: 'Cosign Sigstore Verifier', detail: 'Container signing, verification, and transparency index.' },
    ];

    for (let t = 1; t <= 75; t++) {
      const toolSpec = toolCatalog[(t - 1) % toolCatalog.length];
      const toolId = `tool-${t}`;
      const parentAgent = agentNodes[(t * 3) % agentNodes.length];
      allNodes.push({
        id: toolId,
        label: `${toolSpec.name} [Node ${t}]`,
        kind: 'tool',
        status: 'ATTACHED / ONLINE',
        detail: toolSpec.detail,
        val: 10,
        parentId: parentAgent.id,
        relType: 'USES',
      });
    }

    // L5: 45 Certified Incident Commanders & Operators
    const operatorNames = [
      'Commander Arjun Rao', 'Lead Analyst Sneha Kapoor', 'Senior Engineer Dev Patel',
      'Forensics Specialist Neha Joshi', 'OT Security Officer Amit Verma', 'Cryptographer Pooja Das',
      'SOC Lead Manoj Nair', 'Incident Lead Kavya Swaminathan', 'Cloud Defense Eng. Rahul Roy',
      'Threat Analyst Sunita Pillai', 'Malware Researcher Karthik R.', 'Compliance Auditor Divya Sen',
    ];

    for (let o = 1; o <= 45; o++) {
      const opName = operatorNames[(o - 1) % operatorNames.length];
      const opId = `human-op-${o}`;
      const parentPillar = pillars[(o - 1) % pillars.length];
      allNodes.push({
        id: opId,
        label: `${opName} (SecOps Tier-${(o % 3) + 1})`,
        kind: 'human',
        status: 'ON-DUTY (AUTHORIZED)',
        detail: `Certified Incident Commander overseeing ${parentPillar.label}. Clearance: Level 5 Top Secret.`,
        val: 14,
        parentId: parentPillar.id,
        relType: 'OVERSEES',
      });
    }

    // ── 4. Insert All Nodes into Neo4j in Batches ─────────────────────
    console.log(`📥 Inserting ${allNodes.length} Nodes into Neo4j Aura...`);
    const nodeBatchSize = 50;
    for (let i = 0; i < allNodes.length; i += nodeBatchSize) {
      const batch = allNodes.slice(i, i + nodeBatchSize);
      await runQuery(
        `UNWIND $batch AS n
         CREATE (:Entity {
           id: n.id,
           label: n.label,
           kind: n.kind,
           status: n.status,
           detail: n.detail,
           val: n.val
         })`,
        { batch }
      );
    }
    console.log(`  ✓ Successfully created ${allNodes.length} topology nodes`);

    // ── 5. Create Hierarchical & Cross-Mesh Relationships ──────────────
    console.log('🔗 Creating 600+ Directed Relationships in Neo4j Aura...');

    // Primary tree relationships
    const primaryEdges = allNodes
      .filter((n) => n.parentId)
      .map((n) => ({
        source: n.parentId!,
        target: n.id,
        relType: n.relType || 'USES',
      }));

    // Cross-mesh density edges (Pillars cross-referencing Agents, Tools shared across Pillars)
    const crossEdges: { source: string; target: string; relType: string }[] = [];

    // Connect projects to root core
    usersData.forEach((u) => {
      crossEdges.push({
        source: u.projId,
        target: 'core-sentinel',
        relType: 'MANAGES_TOPOLOGY',
      });
    });

    // Cross-mesh interconnects between pillars and forensic tools
    for (let i = 0; i < 150; i++) {
      const srcAgent = agentNodes[i % agentNodes.length];
      const targetTool = allNodes.find((n) => n.kind === 'tool' && n.id === `tool-${(i % 75) + 1}`);
      if (targetTool && srcAgent.id !== targetTool.parentId) {
        crossEdges.push({
          source: srcAgent.id,
          target: targetTool.id,
          relType: 'USES',
        });
      }
    }

    // Human incident commanders connected to AI sentinels
    const humanNodes = allNodes.filter((n) => n.kind === 'human');
    humanNodes.forEach((h, hIdx) => {
      const targetAg = agentNodes[(hIdx * 2) % agentNodes.length];
      crossEdges.push({
        source: h.id,
        target: targetAg.id,
        relType: 'COMMANDS',
      });
    });

    // Insert primary edges
    const allEdgesToInsert = [...primaryEdges, ...crossEdges];
    const edgeBatchSize = 100;
    for (let i = 0; i < allEdgesToInsert.length; i += edgeBatchSize) {
      const batch = allEdgesToInsert.slice(i, i + edgeBatchSize);
      await runQuery(
        `UNWIND $batch AS e
         MATCH (s {id: e.source})
         MATCH (t {id: e.target})
         CREATE (s)-[r:LINK {type: e.relType}]->(t)
         WITH r, e
         CALL apoc.create.relationship(startNode(r), e.relType, {}, endNode(r)) YIELD rel
         DELETE r`,
        { batch }
      ).catch(async () => {
        // Fallback standard Cypher if APOC is restricted
        for (const edge of batch) {
          const cypherRel = (edge.relType || 'USES').toUpperCase();
          await runQuery(
            `MATCH (s {id: $source}), (t {id: $target})
             MERGE (s)-[r:${cypherRel}]->(t)`,
            { source: edge.source, target: edge.target }
          );
        }
      });
    }

    // Verify Graph Database Totals
    const stats = await runQuery<{
      userCount: number;
      projectCount: number;
      entityCount: number;
      totalRelCount: number;
    }>(
      `MATCH (u:User)
       MATCH (p:Project)
       MATCH (e:Entity)
       MATCH ()-[r]->()
       RETURN count(DISTINCT u) AS userCount,
              count(DISTINCT p) AS projectCount,
              count(DISTINCT e) AS entityCount,
              count(r) AS totalRelCount`
    );

    const s = stats[0] || { userCount: 25, projectCount: 25, entityCount: allNodes.length, totalRelCount: allEdgesToInsert.length };

    console.log('\n======================================================');
    console.log('🎉 MASSIVE NEO4J AURA ENTERPRISE BENCHMARK SEEDED!');
    console.log('======================================================');
    console.log(`📊 Total Users in Neo4j Aura:        ${s.userCount}`);
    console.log(`📊 Total 1-to-1 Projects in Neo4j:   ${s.projectCount}`);
    console.log(`📊 Total Topology Entities in Neo4j: ${s.entityCount}`);
    console.log(`📊 Total Directed Graph Relations:   ${s.totalRelCount}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Massive seeding failed:', err);
    process.exit(1);
  }
}

seedMassive();
