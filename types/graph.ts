import type { SimulationNodeDatum } from 'd3-force';

export type NodeKind = 'core' | 'pillar' | 'agent' | 'task' | 'tool' | 'human';

export interface EntityData {
  id: string;
  label: string;
  kind: NodeKind;
  val?: number;
  color?: string;
  status?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  isExpanded?: boolean;
  hasChildren?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  relType?: string;
}

export interface GraphApiResponse {
  nodes: EntityData[];
  edges: GraphEdge[];
  source?: string;
}

// ── D3 Simulation Types ─────────────────────────────────────────

export interface SimGraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: NodeKind;
  val: number;
  color?: string;
  status?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimLink {
  source: SimGraphNode;
  target: SimGraphNode;
  relType?: string;
  index: number;
}

// ── User & Project Models ───────────────────────────────────────

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt?: string;
  project?: ProjectEntity | null;
}

export interface ProjectEntity {
  id: string;
  name: string;
  deadline: string;
  description: string;
  status?: 'Planning' | 'Active' | 'In Review' | 'Completed' | 'Critical';
  userId?: string;
  createdAt?: string;
  topologyRootId?: string;
}
