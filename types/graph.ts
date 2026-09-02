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
