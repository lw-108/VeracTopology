import type { SimulationNodeDatum } from 'd3-force';

export type NodeKind = 'core' | 'pillar' | 'agent' | 'task' | 'tool' | 'human';

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  val: number;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface SimGraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: NodeKind;
  val: number;
  color?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SimLink {
  source: SimGraphNode;
  target: SimGraphNode;
  label?: string;
  index: number;
}
