import type { EntityData, GraphEdge, NodeKind } from '@/types/graph';

export interface GBrainCategoryMeta {
  label: string;
  count: number;
  color: string;
  borderColor: string;
  textColor: string;
}

export const GBRAIN_NODES: EntityData[] = [
  // ── Core Hub (Obsidian / Central Command Kernel) ─────────────
  {
    id: 'core',
    label: 'Obsidian',
    kind: 'core',
    val: 28,
    color: '#ff6b4a',
    status: 'Operational',
    detail: 'Central Vault & Obsidian Knowledge Core. Neural sync hub orchestrating company memory, AI agents, and automated founder execution pipelines.',
    metadata: { function: 'Executive Vault', tier: 'L0', role: 'Knowledge Core' },
  },

  // ── 6 Core Pillars (Departments) ─────────────────────────────
  {
    id: 'pillar-command',
    label: 'Command',
    kind: 'pillar',
    val: 18,
    color: '#94a3b8',
    status: 'Online',
    detail: 'Executive Strategy & Central Dispatch. Coordinates high-level OKRs, roadmap execution, and priority routing across all departments.',
    metadata: { function: 'Executive', role: 'HQ' },
  },
  {
    id: 'pillar-comms',
    label: 'Comms',
    kind: 'pillar',
    val: 18,
    color: '#94a3b8',
    status: 'Online',
    detail: 'Inbound & Outbound Communications. Triages customer messages, founder inbox, community channels, and partner relations.',
    metadata: { function: 'Communications', role: 'Outreach' },
  },
  {
    id: 'pillar-finance',
    label: 'Finance',
    kind: 'pillar',
    val: 18,
    color: '#94a3b8',
    status: 'Online',
    detail: 'Revenue, Cashflow & Subscriptions. Tracks MRR, burn rate, invoicing pipelines, and accounting reconciliations.',
    metadata: { function: 'Finance', role: 'Treasury' },
  },
  {
    id: 'pillar-content',
    label: 'Content',
    kind: 'pillar',
    val: 18,
    color: '#94a3b8',
    status: 'Online',
    detail: 'Audience & Growth Engine. Manages social publishing, thought leadership, newsletters, and multimedia distribution.',
    metadata: { function: 'Marketing', role: 'Editorial' },
  },
  {
    id: 'pillar-knowledge',
    label: 'Knowledge',
    kind: 'pillar',
    val: 18,
    color: '#94a3b8',
    status: 'Online',
    detail: 'G-Brain Knowledge Base & Second Brain. Vector store and Markdown docs indexing operational playbooks, SOPs, and research.',
    metadata: { function: 'Operations', role: 'Memory Layer' },
  },
  {
    id: 'pillar-automations',
    label: 'Automations',
    kind: 'pillar',
    val: 18,
    color: '#94a3b8',
    status: 'Online',
    detail: 'No-Code & Background Workers. Webhooks, cron triggers, event routing, and cross-platform integrations.',
    metadata: { function: 'Engineering', role: 'Pipelines' },
  },

  // ── AI Agents (8 Nodes - Green) ──────────────────────────────
  {
    id: 'agent-brain-librarian',
    label: 'Brain Librarian',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Indexing',
    detail: 'Autonomous curator that continuously organizes markdown notes, tags unlinked entities, and prunes duplicate claims.',
    metadata: { function: 'Command', action: 'Indexing', pillar: 'pillar-command' },
  },
  {
    id: 'agent-crm-pulse',
    label: 'CRM Pulse',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Active Monitor',
    detail: 'Scans high-value deal status, alerts on overdue leads, and updates pipeline health scores.',
    metadata: { function: 'Finance', action: 'Monitoring', pillar: 'pillar-finance' },
  },
  {
    id: 'agent-inbox-triage',
    label: 'Inbox Triage',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Processing',
    detail: 'Labels, prioritizes, and prepares draft responses for urgent founder communications.',
    metadata: { function: 'Comms', action: 'Triage', pillar: 'pillar-comms' },
  },
  {
    id: 'agent-notion-sync',
    label: 'Notion Sync',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Synchronized',
    detail: 'Two-way synchronization between Obsidian vault notes, local markdown files, and Notion workspace databases.',
    metadata: { function: 'Knowledge', action: 'Sync', pillar: 'pillar-knowledge' },
  },
  {
    id: 'agent-payments-pulse',
    label: 'Payments Pulse',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Live Webhook',
    detail: 'Monitors Stripe and LemonSqueezy payment webhooks, flagging failed charges and churn alerts.',
    metadata: { function: 'Finance', action: 'Monitoring', pillar: 'pillar-finance' },
  },
  {
    id: 'agent-slack-scout',
    label: 'Slack Scout',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Listening',
    detail: 'Listens to key channels, aggregates team summaries, and detects unanswered blocker questions.',
    metadata: { function: 'Comms', action: 'Listening', pillar: 'pillar-comms' },
  },
  {
    id: 'agent-copy-crafter',
    label: 'Copy Crafter',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Drafting',
    detail: 'Transforms founder raw voice memos and bullet points into polished tweets, threads, and newsletter drafts.',
    metadata: { function: 'Content', action: 'Generating', pillar: 'pillar-content' },
  },
  {
    id: 'agent-flow-guardian',
    label: 'Flow Guardian',
    kind: 'agent',
    val: 14,
    color: '#22c55e',
    status: 'Armed',
    detail: 'Monitors automation failure rates, alerts on rate limits, and safely reroutes broken API payloads.',
    metadata: { function: 'Automations', action: 'Observability', pillar: 'pillar-automations' },
  },

  // ── Humans (1 Node - Amber/Yellow) ───────────────────────────
  {
    id: 'human-founder',
    label: 'Solo Founder',
    kind: 'human',
    val: 15,
    color: '#eab308',
    status: 'Operator',
    detail: 'Sole operator and final decision maker. Reviews drafts, signs off contracts, and directs high-level priorities.',
    metadata: { function: 'Command', role: 'Owner', pillar: 'pillar-command' },
  },

  // ── SOP Tasks (8 Nodes - Slate/Silver Ring) ──────────────────
  {
    id: 'task-weekly-review',
    label: 'Weekly Review SOP',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Recurring',
    detail: 'Standard Operating Procedure: Sunday review of weekly metrics, revenue pacing, and upcoming roadmap sprints.',
    metadata: { function: 'Command', pillar: 'pillar-command' },
  },
  {
    id: 'task-lead-outreach',
    label: 'Lead Followup SOP',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Active',
    detail: 'Multi-touch outbound email follow-up sequence for prospective enterprise accounts.',
    metadata: { function: 'Comms', pillar: 'pillar-comms' },
  },
  {
    id: 'task-reconcile-books',
    label: 'Bookkeeping SOP',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Scheduled',
    detail: 'Monthly categorization of bank feeds, tax deduction tagging, and expense approvals.',
    metadata: { function: 'Finance', pillar: 'pillar-finance' },
  },
  {
    id: 'task-publish-pipeline',
    label: 'Publishing Cadence',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Queued',
    detail: 'Multi-platform social distribution SOP: formatting, asset sizing, and scheduling.',
    metadata: { function: 'Content', pillar: 'pillar-content' },
  },
  {
    id: 'task-vault-backup',
    label: 'Vault Snapshot SOP',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Hourly',
    detail: 'Automated encrypted git backup and off-site cloud sync for local Obsidian vaults.',
    metadata: { function: 'Knowledge', pillar: 'pillar-knowledge' },
  },
  {
    id: 'task-webhook-audit',
    label: 'Webhook Health Check',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Continuous',
    detail: 'Ping tests for Zapier, Make, and custom edge endpoints verifying 200 OK delivery.',
    metadata: { function: 'Automations', pillar: 'pillar-automations' },
  },
  {
    id: 'task-daily-briefing',
    label: 'Morning Briefing',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Automated',
    detail: 'Synthesizes overnight alerts, calendar events, and top 3 must-win tasks into a morning dispatch.',
    metadata: { function: 'Command', pillar: 'pillar-command' },
  },
  {
    id: 'task-contract-check',
    label: 'Contract Compliance',
    kind: 'task',
    val: 10,
    color: '#64748b',
    status: 'Passing',
    detail: 'Standardized clause validation for freelancer NDAs and client MSA contracts.',
    metadata: { function: 'Finance', pillar: 'pillar-finance' },
  },

  // ── Tools & Connectors (24 Nodes - Cyan/Blue) ────────────────
  { id: 'tool-notion', label: 'Notion', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Knowledge workspace and structured database tables.' },
  { id: 'tool-slack', label: 'Slack', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Real-time team and client messaging channels.' },
  { id: 'tool-stripe', label: 'Stripe', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Subscription billing engine and payment processor.' },
  { id: 'tool-github', label: 'GitHub', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Code repository, issue tracker, and CI/CD actions.' },
  { id: 'tool-linear', label: 'Linear', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'High-speed issue tracking and sprint planning.' },
  { id: 'tool-x-twitter', label: 'X / Twitter', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Public audience engagement and post broadcast.' },
  { id: 'tool-linkedin', label: 'LinkedIn', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'B2B network reach and founder thought leadership.' },
  { id: 'tool-youtube', label: 'YouTube', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Long-form video tutorials and cohort lectures.' },
  { id: 'tool-gmail', label: 'Gmail', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Email communications and inbox dispatch.' },
  { id: 'tool-calendar', label: 'Google Cal', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Founder schedule, advisor syncs, and client demos.' },
  { id: 'tool-supabase', label: 'Supabase', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'PostgreSQL database, authentication, and vector embeddings.' },
  { id: 'tool-openai', label: 'OpenAI API', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'GPT-4o text embeddings and reasoning inference.' },
  { id: 'tool-anthropic', label: 'Claude 3.5', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'High-context agent reasoning and coding execution.' },
  { id: 'tool-zapier', label: 'Zapier', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Multi-app event triggers and automated zaps.' },
  { id: 'tool-make', label: 'Make.com', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Complex scenario automations and visual routers.' },
  { id: 'tool-resend', label: 'Resend', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Transactional email API for user authentication and alerts.' },
  { id: 'tool-posthog', label: 'PostHog', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Product analytics, event tracking, and feature flags.' },
  { id: 'tool-framer', label: 'Framer', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Landing page design and dynamic marketing CMS.' },
  { id: 'tool-vercel', label: 'Vercel', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Next.js hosting, edge functions, and deployment pipelines.' },
  { id: 'tool-quickbooks', label: 'QuickBooks', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Accounting ledger, P&L reporting, and tax exports.' },
  { id: 'tool-calcom', label: 'Cal.com', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Automated booking and calendar slot coordination.' },
  { id: 'tool-figma', label: 'Figma', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Product UI/UX design and vector graphics.' },
  { id: 'tool-loom', label: 'Loom', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Asynchronous video walk-throughs for team & clients.' },
  { id: 'tool-airtable', label: 'Airtable', kind: 'tool', val: 9, color: '#06b6d4', status: 'Connected', detail: 'Relational database for partner pipelines and sponsor CRM.' },
];

export const GBRAIN_EDGES: GraphEdge[] = [
  // Core to Pillars
  { source: 'core', target: 'pillar-command', relType: 'COMMANDS' },
  { source: 'core', target: 'pillar-comms', relType: 'COMMANDS' },
  { source: 'core', target: 'pillar-finance', relType: 'COMMANDS' },
  { source: 'core', target: 'pillar-content', relType: 'COMMANDS' },
  { source: 'core', target: 'pillar-knowledge', relType: 'COMMANDS' },
  { source: 'core', target: 'pillar-automations', relType: 'COMMANDS' },

  // Command Pillar
  { source: 'pillar-command', target: 'human-founder', relType: 'OVERSEES' },
  { source: 'pillar-command', target: 'agent-brain-librarian', relType: 'OVERSEES' },
  { source: 'pillar-command', target: 'task-weekly-review', relType: 'OVERSEES' },
  { source: 'pillar-command', target: 'task-daily-briefing', relType: 'OVERSEES' },

  // Comms Pillar
  { source: 'pillar-comms', target: 'agent-inbox-triage', relType: 'OVERSEES' },
  { source: 'pillar-comms', target: 'agent-slack-scout', relType: 'OVERSEES' },
  { source: 'pillar-comms', target: 'task-lead-outreach', relType: 'OVERSEES' },

  // Finance Pillar
  { source: 'pillar-finance', target: 'agent-payments-pulse', relType: 'OVERSEES' },
  { source: 'pillar-finance', target: 'agent-crm-pulse', relType: 'OVERSEES' },
  { source: 'pillar-finance', target: 'task-reconcile-books', relType: 'OVERSEES' },
  { source: 'pillar-finance', target: 'task-contract-check', relType: 'OVERSEES' },

  // Content Pillar
  { source: 'pillar-content', target: 'agent-copy-crafter', relType: 'OVERSEES' },
  { source: 'pillar-content', target: 'task-publish-pipeline', relType: 'OVERSEES' },

  // Knowledge Pillar
  { source: 'pillar-knowledge', target: 'agent-notion-sync', relType: 'OVERSEES' },
  { source: 'pillar-knowledge', target: 'task-vault-backup', relType: 'OVERSEES' },

  // Automations Pillar
  { source: 'pillar-automations', target: 'agent-flow-guardian', relType: 'OVERSEES' },
  { source: 'pillar-automations', target: 'task-webhook-audit', relType: 'OVERSEES' },

  // Agents to Tools
  { source: 'agent-brain-librarian', target: 'tool-openai', relType: 'USES' },
  { source: 'agent-brain-librarian', target: 'tool-anthropic', relType: 'USES' },
  { source: 'agent-brain-librarian', target: 'tool-supabase', relType: 'USES' },

  { source: 'agent-inbox-triage', target: 'tool-gmail', relType: 'USES' },
  { source: 'agent-inbox-triage', target: 'tool-calcom', relType: 'USES' },

  { source: 'agent-slack-scout', target: 'tool-slack', relType: 'USES' },

  { source: 'agent-crm-pulse', target: 'tool-airtable', relType: 'USES' },
  { source: 'agent-crm-pulse', target: 'tool-resend', relType: 'USES' },

  { source: 'agent-payments-pulse', target: 'tool-stripe', relType: 'USES' },
  { source: 'agent-payments-pulse', target: 'tool-quickbooks', relType: 'USES' },

  { source: 'agent-copy-crafter', target: 'tool-x-twitter', relType: 'USES' },
  { source: 'agent-copy-crafter', target: 'tool-linkedin', relType: 'USES' },
  { source: 'agent-copy-crafter', target: 'tool-youtube', relType: 'USES' },

  { source: 'agent-notion-sync', target: 'tool-notion', relType: 'USES' },
  { source: 'agent-notion-sync', target: 'tool-github', relType: 'USES' },

  { source: 'agent-flow-guardian', target: 'tool-zapier', relType: 'USES' },
  { source: 'agent-flow-guardian', target: 'tool-make', relType: 'USES' },
  { source: 'agent-flow-guardian', target: 'tool-posthog', relType: 'USES' },
  { source: 'agent-flow-guardian', target: 'tool-vercel', relType: 'USES' },

  { source: 'human-founder', target: 'tool-linear', relType: 'USES' },
  { source: 'human-founder', target: 'tool-figma', relType: 'USES' },
  { source: 'human-founder', target: 'tool-loom', relType: 'USES' },
  { source: 'human-founder', target: 'tool-framer', relType: 'USES' },
];

export const CATEGORY_CONFIG: Record<
  NodeKind,
  { label: string; color: string; ringColor: string; iconName: string }
> = {
  core: { label: 'Obsidian', color: '#ff6b4a', ringColor: '#ff6b4a', iconName: 'Cpu' },
  pillar: { label: 'Pillars', color: '#94a3b8', ringColor: '#475569', iconName: 'Layers' },
  task: { label: 'SOP tasks', color: '#64748b', ringColor: '#334155', iconName: 'ClipboardList' },
  human: { label: 'Humans', color: '#eab308', ringColor: '#ca8a04', iconName: 'UserRound' },
  agent: { label: 'AI agents', color: '#22c55e', ringColor: '#16a34a', iconName: 'Bot' },
  tool: { label: 'Tools', color: '#06b6d4', ringColor: '#0891b2', iconName: 'Wrench' },
};
