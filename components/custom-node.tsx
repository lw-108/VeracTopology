'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Cpu,
  Layers,
  Bot,
  ClipboardList,
  Wrench,
  UserRound,
  Plus,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import type { NodeKind } from '@/types/graph';

export interface CustomNodeData {
  label: string;
  kind: NodeKind;
  status?: string;
  detail?: string;
  val?: number;
  color?: string;
  metadata?: Record<string, unknown>;
  selected?: boolean;
  /** Whether this node's children are currently expanded */
  isExpanded?: boolean;
  /** Whether this node has children that can be expanded */
  hasChildren?: boolean;
  /** Count of direct children */
  childrenCount?: number;
  /** Callback to toggle expand/collapse — injected from FlowCanvas */
  onToggleExpand?: (nodeId: string) => void;
  /** The node ID — needed for the callback */
  nodeId?: string;
}

const KIND_CONFIG: Record<
  NodeKind,
  {
    icon: LucideIcon;
    kindLabel: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  core: {
    icon: Cpu,
    kindLabel: 'Core',
    accentColor: '#0f172a',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-white',
    badgeBorder: 'border-slate-800',
  },
  pillar: {
    icon: Layers,
    kindLabel: 'Pillar',
    accentColor: '#7c3aed',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
  agent: {
    icon: Bot,
    kindLabel: 'Agent',
    accentColor: '#0284c7',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
  },
  task: {
    icon: ClipboardList,
    kindLabel: 'Task',
    accentColor: '#64748b',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
  },
  tool: {
    icon: Wrench,
    kindLabel: 'Tool',
    accentColor: '#e11d48',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
  },
  human: {
    icon: UserRound,
    kindLabel: 'Operator',
    accentColor: '#d97706',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
};

function CustomNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const kind = (nodeData.kind || 'agent') as NodeKind;
  const config = KIND_CONFIG[kind] || KIND_CONFIG.agent;
  const Icon = config.icon;

  const hasChildren = nodeData.hasChildren ?? false;
  const isExpanded = nodeData.isExpanded ?? false;

  return (
    <div
      className={`relative min-w-[210px] max-w-[260px] rounded-xl bg-white transition-all duration-150 ${
        selected
          ? 'ring-2 ring-slate-900 shadow-md border-transparent'
          : 'border border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow'
      }`}
    >
      {/* Top Handle (Target / Input) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-white !border-[1.5px] !border-slate-400 hover:!border-slate-900 transition-colors"
      />

      {/* Node Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-md text-white shrink-0 shadow-xs"
              style={{ backgroundColor: nodeData.color || config.accentColor }}
            >
              <Icon size={13} strokeWidth={2.2} />
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
            >
              {config.kindLabel}
            </span>
          </div>

          {nodeData.status && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 shrink-0">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  nodeData.status.toLowerCase().includes('run') ||
                  nodeData.status.toLowerCase().includes('active') ||
                  nodeData.status.toLowerCase().includes('live') ||
                  nodeData.status.toLowerCase().includes('armed') ||
                  nodeData.status.toLowerCase().includes('connect') ||
                  nodeData.status.toLowerCase().includes('pass')
                    ? 'bg-emerald-500'
                    : nodeData.status.toLowerCase().includes('scan') ||
                      nodeData.status.toLowerCase().includes('monitor')
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="truncate max-w-[80px]">{nodeData.status}</span>
            </span>
          )}
        </div>

        {/* Title / Label */}
        <div className="font-semibold text-slate-900 text-sm tracking-tight truncate">
          {nodeData.label}
        </div>

        {/* Detail snippet */}
        {nodeData.detail && (
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed line-clamp-2">
            {nodeData.detail}
          </p>
        )}
      </div>

      {/* Bottom Handle (Source / Output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-white !border-[1.5px] !border-slate-400 hover:!border-slate-900 transition-colors"
      />

      {/* Left Handle */}
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!w-2 !h-2 !bg-white !border-[1.5px] !border-slate-300 hover:!border-slate-900 transition-colors opacity-40 hover:opacity-100"
      />

      {/* Right Handle */}
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!w-2 !h-2 !bg-white !border-[1.5px] !border-slate-300 hover:!border-slate-900 transition-colors opacity-40 hover:opacity-100"
      />

      {/* ── Expand / Collapse Button (right side) ──────────── */}
      {hasChildren && (
        <button
          className={`absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center gap-0.5 rounded-full border-[1.5px] shadow-sm transition-all duration-150 hover:scale-110 ${
            isExpanded
              ? 'w-7 h-7 bg-slate-900 border-slate-800 text-white hover:bg-slate-700'
              : nodeData.childrenCount && nodeData.childrenCount > 0
              ? 'px-2 py-1 h-7 bg-white border-purple-300 text-purple-700 hover:border-purple-600 hover:bg-purple-50 text-[11px] font-bold'
              : 'w-7 h-7 bg-white border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (nodeData.onToggleExpand && nodeData.nodeId) {
              nodeData.onToggleExpand(nodeData.nodeId);
            }
          }}
          title={isExpanded ? 'Collapse children' : `Expand ${nodeData.childrenCount || ''} children`}
        >
          {isExpanded ? (
            <Minus size={12} strokeWidth={2.5} />
          ) : (
            <>
              <Plus size={12} strokeWidth={2.5} />
              {nodeData.childrenCount && nodeData.childrenCount > 0 && (
                <span>{nodeData.childrenCount}</span>
              )}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
