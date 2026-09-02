'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';

import {
  Search,
  Plus,
  RotateCcw,
  Layers,
  Bot,
  Wrench,
  ClipboardList,
  UserRound,
  Cpu,
  ChevronRight,
  X,
  Shield,
  LayoutGrid,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  Edit3,
  Trash2,
} from 'lucide-react';

import { CustomNode, type CustomNodeData } from './custom-node';
import { UserProjectManager } from './user-project-manager';
import { DEFAULT_NODES, DEFAULT_EDGES } from '@/lib/default-topology';
import { getLayoutedElements } from '@/lib/flow-layout';
import type { NodeKind, EntityData, GraphEdge, GraphApiResponse } from '@/types/graph';

// Register custom node types
const nodeTypes = {
  custom: CustomNode,
};

type EdgeRoutingType = 'smoothstep' | 'step' | 'default' | 'straight';

const KIND_COLORS: Record<NodeKind, string> = {
  core: '#0f172a',
  pillar: '#7c3aed',
  agent: '#0284c7',
  task: '#64748b',
  tool: '#e11d48',
  human: '#d97706',
};

function FlowCanvas() {
  const reactFlowInstance = useReactFlow();

  // Active visible nodes & edges in the viewport
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesStateChange] = useEdgesState<Edge>([]);

  // Master graph state (all nodes & all edges from API / defaults)
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  // UI state
  const [edgeType, setEdgeType] = useState<EdgeRoutingType>('smoothstep');
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [selectedKindFilter, setSelectedKindFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dbSource, setDbSource] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expanded nodes set
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Parent -> Children map and Child -> Parent map
  const { childrenMap, parentsMap } = useMemo(() => {
    const cMap = new Map<string, string[]>();
    const pMap = new Map<string, string[]>();

    allEdges.forEach((e) => {
      const cList = cMap.get(e.source) || [];
      if (!cList.includes(e.target)) cList.push(e.target);
      cMap.set(e.source, cList);

      const pList = pMap.get(e.target) || [];
      if (!pList.includes(e.source)) pList.push(e.source);
      pMap.set(e.target, pList);
    });

    return { childrenMap: cMap, parentsMap: pMap };
  }, [allEdges]);

  // Find root nodes (prioritize 'core' and top-level domain hubs, cap to clean root set)
  const rootNodeIds = useMemo(() => {
    if (allNodes.length === 0) return [];
    
    // 1. Look for explicit Core / Domain / Root nodes first
    const coreNodes = allNodes.filter((n) => {
      const k = (n.data as unknown as CustomNodeData)?.kind;
      return k === 'core' || n.id === 'core' || n.id === 'core-sentinel' || n.id === 'sentinel-core';
    });
    if (coreNodes.length > 0) {
      return coreNodes.map((n) => n.id);
    }

    // 2. Look for Pillar / Subnet / Domain hubs
    const pillarNodes = allNodes.filter((n) => {
      const k = (n.data as unknown as CustomNodeData)?.kind;
      return k === 'pillar';
    });
    if (pillarNodes.length > 0) {
      return pillarNodes.map((n) => n.id);
    }

    // 3. Fallback: Nodes with zero incoming edges (capped at 15 max)
    const targetIds = new Set(allEdges.map((e) => e.target));
    const roots = allNodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id);
    if (roots.length > 0) {
      return roots.slice(0, 15);
    }

    return [allNodes[0].id];
  }, [allNodes, allEdges]);

  // Helper to retrieve all ancestors for a given node ID
  const getAncestors = useCallback(
    (nodeId: string): string[] => {
      const ancestors = new Set<string>();
      const queue = [nodeId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const parents = parentsMap.get(current) || [];
        parents.forEach((p) => {
          if (!ancestors.has(p)) {
            ancestors.add(p);
            queue.push(p);
          }
        });
      }
      return Array.from(ancestors);
    },
    [parentsMap]
  );

  // Search matching node IDs + their entire path from root
  const searchMatchedNodes = useMemo(() => {
    if (!searchQuery.trim()) return { matchIds: new Set<string>(), visibleIds: new Set<string>() };
    const q = searchQuery.toLowerCase().trim();
    const directMatches = new Set<string>();
    const allVisibleWithAncestors = new Set<string>();

    allNodes.forEach((node) => {
      const d = node.data as unknown as CustomNodeData;
      const isMatch =
        d.label.toLowerCase().includes(q) ||
        node.id.toLowerCase().includes(q) ||
        (d.detail && d.detail.toLowerCase().includes(q)) ||
        (d.kind && d.kind.toLowerCase().includes(q)) ||
        (d.status && d.status.toLowerCase().includes(q));

      if (isMatch) {
        directMatches.add(node.id);
        allVisibleWithAncestors.add(node.id);
        getAncestors(node.id).forEach((a) => allVisibleWithAncestors.add(a));
      }
    });

    return { matchIds: directMatches, visibleIds: allVisibleWithAncestors };
  }, [searchQuery, allNodes, getAncestors]);

  // Category filter matched nodes + ancestors
  const kindFilterMatchedIds = useMemo(() => {
    if (selectedKindFilter === 'all') return new Set<string>();
    const visibleWithAncestors = new Set<string>();

    allNodes.forEach((node) => {
      const d = node.data as unknown as CustomNodeData;
      if (d.kind === selectedKindFilter) {
        visibleWithAncestors.add(node.id);
        getAncestors(node.id).forEach((a) => visibleWithAncestors.add(a));
      }
    });

    return visibleWithAncestors;
  }, [selectedKindFilter, allNodes, getAncestors]);

  // Compute final visible node IDs
  const visibleNodeIds = useMemo(() => {
    // 1. Search takes highest priority: reveal all matching nodes & connected paths
    if (searchQuery.trim() && searchMatchedNodes.visibleIds.size > 0) {
      return searchMatchedNodes.visibleIds;
    }

    // 2. Category filter takes secondary priority if selected
    if (selectedKindFilter !== 'all' && kindFilterMatchedIds.size > 0) {
      return kindFilterMatchedIds;
    }

    // 3. Default: Progressive expand / collapse hierarchy from root
    const visible = new Set<string>();
    rootNodeIds.forEach((id) => visible.add(id));

    const queue = [...rootNodeIds];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (expandedNodes.has(current)) {
        const children = childrenMap.get(current) || [];
        children.forEach((childId) => {
          if (!visible.has(childId)) {
            visible.add(childId);
            queue.push(childId);
          }
        });
      }
    }

    return visible;
  }, [searchQuery, searchMatchedNodes, selectedKindFilter, kindFilterMatchedIds, rootNodeIds, expandedNodes, childrenMap]);

  // Nodes with children
  const nodesWithChildren = useMemo(() => {
    const set = new Set<string>();
    childrenMap.forEach((children, parent) => {
      if (children.length > 0) set.add(parent);
    });
    return set;
  }, [childrenMap]);

  // New Node Form State
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeKind, setNewNodeKind] = useState<NodeKind>('pillar');
  const [newNodeStatus, setNewNodeStatus] = useState('Operational');
  const [newNodeDetail, setNewNodeDetail] = useState('');
  const [newNodeParent, setNewNodeParent] = useState('');

  // Edit Node Form State
  const [isEditNodeOpen, setIsEditNodeOpen] = useState(false);
  const [editNodeLabel, setEditNodeLabel] = useState('');
  const [editNodeKind, setEditNodeKind] = useState<NodeKind>('pillar');
  const [editNodeStatus, setEditNodeStatus] = useState('Operational');
  const [editNodeDetail, setEditNodeDetail] = useState('');

  // Default parent when modal opens or rootNodeIds resolves
  useEffect(() => {
    if (!newNodeParent && rootNodeIds.length > 0) {
      setNewNodeParent(rootNodeIds[0]);
    }
  }, [rootNodeIds, newNodeParent]);

  // Auto-expand root nodes on initial load for clean overview
  useEffect(() => {
    if (rootNodeIds.length > 0 && expandedNodes.size === 0) {
      setExpandedNodes(new Set(rootNodeIds));
    }
  }, [rootNodeIds, expandedNodes.size]);

  // Close modals & inspector on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddNodeOpen(false);
        setIsEditNodeOpen(false);
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle expand / collapse
  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          // Collapse nodeId and all descendants
          const toCollapse = [nodeId];
          while (toCollapse.length > 0) {
            const current = toCollapse.pop()!;
            next.delete(current);
            const children = childrenMap.get(current) || [];
            children.forEach((c) => {
              if (next.has(c)) toCollapse.push(c);
            });
          }
        } else {
          // Expand direct node
          next.add(nodeId);
        }
        return next;
      });
    },
    [childrenMap]
  );

  // Smart Expand All: Expand top 2 tiers (Core + Pillars) or primary parents cleanly
  const handleExpandAll = useCallback(() => {
    const topParents = new Set<string>();
    // Add root nodes and their immediate children
    rootNodeIds.forEach((r) => {
      topParents.add(r);
      const directChildren = childrenMap.get(r) || [];
      directChildren.forEach((c) => topParents.add(c));
    });

    // If dataset is modest, expand all parents
    if (childrenMap.size <= 40) {
      childrenMap.forEach((_, parent) => topParents.add(parent));
    }

    setExpandedNodes(topParents);
  }, [childrenMap, rootNodeIds]);

  // Collapse all: Reset to root nodes expanded only
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set(rootNodeIds));
    setSelectedKindFilter('all');
    setSearchQuery('');
  }, [rootNodeIds]);

  const isAllExpanded = useMemo(() => {
    let count = 0;
    expandedNodes.forEach((id) => {
      if (childrenMap.has(id)) count++;
    });
    return count >= Math.min(childrenMap.size, 15) && childrenMap.size > 0;
  }, [expandedNodes, childrenMap]);

  // Convert raw entities to flow objects
  const rawEntitiesToFlow = useCallback(
    (entities: EntityData[], graphEdges: GraphEdge[], edgeRouting: EdgeRoutingType) => {
      const flowNodes: Node[] = entities.map((e) => ({
        id: e.id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          label: e.label,
          kind: e.kind,
          status: e.status || 'Active',
          detail: e.detail || '',
          val: e.val || 10,
          color: e.color || KIND_COLORS[e.kind],
          metadata: e.metadata || {},
          nodeId: e.id,
        },
      }));

      const flowEdges: Edge[] = graphEdges.map((link, idx) => ({
        id: `e-${link.source}-${link.target}-${idx}`,
        source: link.source,
        target: link.target,
        type: edgeRouting,
        label: link.relType ? link.relType.toLowerCase() : '',
        animated: false,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: '#94a3b8',
        },
        labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        labelBgBorderRadius: 4,
        labelBgPadding: [6, 4] as [number, number],
      }));

      return { nodes: flowNodes, edges: flowEdges };
    },
    []
  );

  // Fetch initial graph data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const res = await fetch('/api/graph/all');
        if (!res.ok) throw new Error('API returned error');
        const data: GraphApiResponse = await res.json();
        if (cancelled) return;

        if (data.nodes && data.nodes.length > 0) {
          const { nodes: fn, edges: fe } = rawEntitiesToFlow(data.nodes, data.edges || [], edgeType);
          setAllNodes(fn);
          setAllEdges(fe);
          setDbSource(data.source || 'live');
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `%c[GraphOS DB] source: ${data.source} | nodes: ${data.nodes.length} | edges: ${(data.edges || []).length}`,
              data.source === 'fallback-topology'
                ? 'color: #f59e0b; font-weight: bold;'
                : 'color: #22c55e; font-weight: bold;'
            );
          }
        } else {
          throw new Error('empty data');
        }
      } catch {
        if (cancelled) return;
        const { nodes: fn, edges: fe } = rawEntitiesToFlow(DEFAULT_NODES, DEFAULT_EDGES, edgeType);
        setAllNodes(fn);
        setAllEdges(fe);
        setDbSource('fallback-topology');
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [rawEntitiesToFlow, edgeType]);

  // Re-layout and push to visible nodes/edges whenever visibility/expansion/direction changes
  useEffect(() => {
    if (allNodes.length === 0) return;

    const filteredNodes = allNodes.filter((n) => visibleNodeIds.has(n.id));

    const enrichedNodes: Node[] = filteredNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isExpanded: expandedNodes.has(n.id) || searchMatchedNodes.matchIds.size > 0,
        hasChildren: nodesWithChildren.has(n.id),
        childrenCount: (childrenMap.get(n.id) || []).length,
        onToggleExpand: handleToggleExpand,
        nodeId: n.id,
      },
    }));

    const filteredEdges = allEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => ({ ...e, type: edgeType }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      enrichedNodes,
      filteredEdges,
      direction
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 60);
  }, [
    allNodes,
    allEdges,
    visibleNodeIds,
    expandedNodes,
    nodesWithChildren,
    handleToggleExpand,
    direction,
    edgeType,
    reactFlowInstance,
    setNodes,
    setEdges,
    searchMatchedNodes,
  ]);

  // Handle edge type change
  const handleEdgeTypeChange = useCallback(
    (newType: EdgeRoutingType) => {
      setEdgeType(newType);
      setAllEdges((eds) => eds.map((e) => ({ ...e, type: newType })));
      setEdges((eds) => eds.map((e) => ({ ...e, type: newType })));
    },
    [setEdges]
  );

  // Handle re-layout direction change
  const handleLayout = useCallback(
    (newDirection?: 'TB' | 'LR') => {
      const targetDir = newDirection || direction;
      setDirection(targetDir);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        targetDir
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 500 });
      }, 50);
    },
    [direction, nodes, edges, reactFlowInstance, setNodes, setEdges]
  );

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        type: edgeType,
        animated: false,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: '#94a3b8',
        },
        label: 'uses',
        labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        labelBgBorderRadius: 4,
        labelBgPadding: [6, 4] as [number, number],
      };
      setAllEdges((eds) => [...eds, newEdge]);
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edgeType, setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Display nodes with search highlighting
  const displayNodes = useMemo(() => {
    return nodes.map((node) => {
      const isSearchMatch = searchMatchedNodes.matchIds.has(node.id);
      return {
        ...node,
        selected: node.id === selectedNodeId || isSearchMatch,
      };
    });
  }, [nodes, searchMatchedNodes, selectedNodeId]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return allNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, allNodes]);

  const selectedNodeData = selectedNode
    ? (selectedNode.data as unknown as CustomNodeData)
    : null;

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return { incoming: [], outgoing: [] };

    const incomingIds = allEdges
      .filter((e) => e.target === selectedNodeId)
      .map((e) => e.source);

    const outgoingIds = allEdges
      .filter((e) => e.source === selectedNodeId)
      .map((e) => e.target);

    const incoming = allNodes.filter((n) => incomingIds.includes(n.id));
    const outgoing = allNodes.filter((n) => outgoingIds.includes(n.id));

    return { incoming, outgoing };
  }, [selectedNodeId, allEdges, allNodes]);

  const focusNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      const target = nodes.find((n) => n.id === nodeId);
      if (target) {
        reactFlowInstance.setCenter(
          target.position.x + 120,
          target.position.y + 55,
          { zoom: 1.2, duration: 500 }
        );
      }
    },
    [nodes, reactFlowInstance]
  );

  // Add entity handler
  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    // Use selected parent or default to the primary root node
    const parentId = newNodeParent || rootNodeIds[0] || allNodes[0]?.id || 'core-sentinel';
    const slug = newNodeLabel.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newId = `${newNodeKind}-${slug}-${Math.floor(Math.random() * 1000)}`;

    const newNode: Node = {
      id: newId,
      type: 'custom',
      position: {
        x: (selectedNode?.position.x || 300) + Math.random() * 80 - 40,
        y: (selectedNode?.position.y || 300) + 160,
      },
      data: {
        label: newNodeLabel.trim(),
        kind: newNodeKind,
        status: newNodeStatus,
        detail: newNodeDetail || `Custom ${newNodeKind} node`,
        color: KIND_COLORS[newNodeKind],
        nodeId: newId,
      },
    };

    const rel = newNodeKind === 'pillar' ? 'COMMANDS' : 'USES';
    const newEdge: Edge = {
      id: `e-${parentId}-${newId}-${Date.now()}`,
      source: parentId,
      target: newId,
      type: edgeType,
      label: rel.toLowerCase(),
      style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: '#94a3b8',
      },
      labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
      labelBgBorderRadius: 4,
      labelBgPadding: [6, 4] as [number, number],
    };

    // 1. Immediately update master nodes & edges in memory
    setAllNodes((nds) => [...nds, newNode]);
    setAllEdges((eds) => [...eds, newEdge]);

    // 2. Expand parent so new node is immediately visible on canvas
    setExpandedNodes((prev) => new Set([...prev, parentId]));

    // 3. Clear form
    setNewNodeLabel('');
    setNewNodeDetail('');
    setIsAddNodeOpen(false);
    setSelectedNodeId(newId);

    // 4. Persist to Neo4j in the background
    try {
      await fetch('/api/graph/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          label: newNodeLabel.trim(),
          kind: newNodeKind,
          status: newNodeStatus,
          detail: newNodeDetail,
          parentId,
          relType: rel,
        }),
      });
    } catch (err) {
      console.warn('[AddNode] Background save warning:', err);
    }
  };

  // Open Edit Node Modal
  const handleOpenEditNode = () => {
    if (!selectedNodeData || !selectedNodeId) return;
    setEditNodeLabel(selectedNodeData.label);
    setEditNodeKind(selectedNodeData.kind);
    setEditNodeStatus(selectedNodeData.status || 'Active');
    setEditNodeDetail(selectedNodeData.detail || '');
    setIsEditNodeOpen(true);
  };

  // Update Node Contents in Neo4j and React state
  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !editNodeLabel.trim()) return;

    const updatedData = {
      label: editNodeLabel.trim(),
      kind: editNodeKind,
      status: editNodeStatus,
      detail: editNodeDetail.trim(),
      color: KIND_COLORS[editNodeKind],
    };

    // 1. Update in-memory allNodes
    setAllNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              data: {
                ...n.data,
                ...updatedData,
              },
            }
          : n
      )
    );

    setIsEditNodeOpen(false);

    // 2. Persist to Neo4j in background
    try {
      await fetch(`/api/graph/${selectedNodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
    } catch (err) {
      console.warn('[EditNode] Failed to save update:', err);
    }
  };

  // Delete Node from Neo4j and React state
  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this element and its connections from the topology?')) return;

    // 1. Remove from allNodes & allEdges
    setAllNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setAllEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);

    // 2. Persist deletion to Neo4j
    try {
      await fetch(`/api/graph/${nodeId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[DeleteNode] Failed to delete node in Neo4j:', err);
    }
  };

  // Node count per category across all nodes
  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allNodes.length,
      core: 0,
      pillar: 0,
      agent: 0,
      task: 0,
      tool: 0,
      human: 0,
    };
    allNodes.forEach((n) => {
      const k = (n.data as unknown as CustomNodeData)?.kind;
      if (k && counts[k] !== undefined) counts[k]++;
    });
    return counts;
  }, [allNodes]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans select-none flex flex-col">
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0 shadow-xs">
        {/* Left: Branding + Expand/Collapse All */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white shadow-xs">
            <Shield size={16} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <span>Sentinel Core</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-normal">Topology</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${
                dbSource === 'live-postgres' || dbSource === 'live-apache-age' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-amber-500'
              }`} />
              <span>{nodes.length} / {allNodes.length} Visible</span>
              <span>·</span>
              <span>{edges.length} Connections</span>
              <span>·</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                dbSource === 'live-postgres'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : dbSource === 'live-apache-age'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {dbSource === 'live-postgres' ? 'PG: Live Connected' : dbSource === 'live-apache-age' ? 'AGE: Live Graph' : 'Mock Fallback'}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Global Expand / Collapse All Button */}
          <button
            onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-xs transition-all duration-150 ${
              isAllExpanded
                ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
            title={isAllExpanded ? 'Collapse all nodes to root' : 'Expand all nodes'}
          >
            {isAllExpanded ? (
              <>
                <Minimize2 size={13} />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <Maximize2 size={13} />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>

        {/* Center: Live Search */}
        <div className="hidden md:flex items-center gap-2 max-w-xl flex-1 mx-6">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by label, ID, category, or telemetry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md shrink-0">
              {searchMatchedNodes.matchIds.size} {searchMatchedNodes.matchIds.size === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>

        {/* Right: User & Project Registry + Actions & Edge Switcher */}
        <div className="flex items-center gap-2">
          {/* User & Project Manager Dropdown / Registry */}
          <UserProjectManager />

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Edge Style Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {(['smoothstep', 'step', 'default', 'straight'] as EdgeRoutingType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleEdgeTypeChange(type)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                  edgeType === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title={`Switch edge style to ${type === 'default' ? 'curved' : type}`}
              >
                {type === 'smoothstep' ? 'Smooth' : type === 'default' ? 'Curved' : type}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Re-layout button */}
          <button
            onClick={() => handleLayout(direction === 'TB' ? 'LR' : 'TB')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            title="Auto-organize layout direction"
          >
            <ArrowRightLeft size={13} className="text-slate-500" />
            <span>{direction === 'TB' ? 'Top-Down' : 'Left-Right'}</span>
          </button>

          {/* Add Node Button */}
          <button
            onClick={() => {
              if (rootNodeIds.length > 0) setNewNodeParent(rootNodeIds[0]);
              setIsAddNodeOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Node</span>
          </button>
        </div>
      </header>

      {/* ── Subheader Category Bar ──────────────────────────────────────── */}
      <div className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: 'All Elements', icon: LayoutGrid },
            { id: 'core', label: 'Core', icon: Cpu },
            { id: 'pillar', label: 'Pillars', icon: Layers },
            { id: 'agent', label: 'Agents', icon: Bot },
            { id: 'task', label: 'Tasks', icon: ClipboardList },
            { id: 'tool', label: 'Tools', icon: Wrench },
            { id: 'human', label: 'Operators', icon: UserRound },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedKindFilter === item.id;
            const count = kindCounts[item.id] || 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedKindFilter(item.id);
                  if (item.id !== 'all') setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={12} />
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1 rounded ${
                    isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setSelectedKindFilter('all');
              setSearchQuery('');
              reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
            }}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* ── Main Canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative w-full h-full">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesStateChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          className="bg-slate-50"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.4}
            color="#cbd5e1"
            className="bg-slate-50/60"
          />

          <Controls
            showInteractive={false}
            className="!bg-white !border !border-slate-200 !rounded-xl !shadow-sm !overflow-hidden"
          />

          <MiniMap
            nodeColor={(n) => {
              const d = n.data as unknown as CustomNodeData;
              return d?.color || KIND_COLORS[d?.kind || 'agent'] || '#cbd5e1';
            }}
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskColor="rgba(248, 250, 252, 0.75)"
            className="!bg-white !border !border-slate-200 !rounded-xl !shadow-sm !bottom-4 !right-4 !w-44 !h-32"
          />
        </ReactFlow>

        {/* ── Right Node Inspector Drawer ───────────────────────────────── */}
        {selectedNodeData && (
          <aside className="absolute right-4 top-4 bottom-4 w-80 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl z-30 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedNodeData.color || '#0f172a' }}
                >
                  <Cpu size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {selectedNodeData.kind}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {selectedNodeData.label}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Status
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{selectedNodeData.status || 'Active'}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </div>
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                  {selectedNodeData.detail || 'No detailed telemetry available for this entity.'}
                </p>
              </div>

              {selectedNodeData.metadata && Object.keys(selectedNodeData.metadata).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Telemetry Metadata
                  </div>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    {Object.entries(selectedNodeData.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-2 text-[11px]">
                        <span className="text-slate-500 font-mono">{k}</span>
                        <span className="text-slate-800 font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Upstream ({connectedNodes.incoming.length})
                </div>
                {connectedNodes.incoming.length === 0 ? (
                  <p className="text-slate-400 italic">No incoming connections (Root level)</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {connectedNodes.incoming.map((n) => {
                      const d = n.data as unknown as CustomNodeData;
                      return (
                        <button
                          key={n.id}
                          onClick={() => focusNode(n.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-[11px]"
                        >
                          <ChevronRight size={10} className="text-slate-400 rotate-180" />
                          <span>{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Downstream ({connectedNodes.outgoing.length})
                </div>
                {connectedNodes.outgoing.length === 0 ? (
                  <p className="text-slate-400 italic">No outgoing connections (Leaf node)</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {connectedNodes.outgoing.map((n) => {
                      const d = n.data as unknown as CustomNodeData;
                      return (
                        <button
                          key={n.id}
                          onClick={() => focusNode(n.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-[11px]"
                        >
                          <span>{d.label}</span>
                          <ChevronRight size={10} className="text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
              <button
                onClick={() => focusNode(selectedNodeId!)}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Center View
              </button>
              <button
                onClick={handleOpenEditNode}
                className="flex items-center gap-1 py-2 px-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium shadow-2xs transition-colors"
                title="Edit Element Contents"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNodeId!)}
                className="p-2 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg shadow-2xs transition-colors"
                title="Delete Element from Topology"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </aside>
        )}

        {/* ── Edit Node Modal (Rendered via Portal) ────────────────────── */}
        {mounted &&
          isEditNodeOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
              onClick={() => setIsEditNodeOpen(false)}
            >
              <div
                className="relative w-full max-w-md my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-900 text-white shadow-xs">
                      <Edit3 size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Edit Element Contents</h2>
                      <p className="text-xs text-slate-500">Update node attributes and telemetry in Neo4j Aura</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditNodeOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleUpdateNode} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Element Label</label>
                    <input
                      type="text"
                      required
                      value={editNodeLabel}
                      onChange={(e) => setEditNodeLabel(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Category (Kind)</label>
                      <select
                        value={editNodeKind}
                        onChange={(e) => setEditNodeKind(e.target.value as NodeKind)}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400 text-xs"
                      >
                        <option value="pillar">Pillar (Domain Hub)</option>
                        <option value="agent">Agent (AI Sentinel)</option>
                        <option value="task">Task (Job/Enforcer)</option>
                        <option value="tool">Tool (Integration)</option>
                        <option value="human">Operator (Human)</option>
                        <option value="core">Core (SOC Kernel)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Status</label>
                      <input
                        type="text"
                        value={editNodeStatus}
                        onChange={(e) => setEditNodeStatus(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description & Telemetry</label>
                    <textarea
                      rows={3}
                      value={editNodeDetail}
                      onChange={(e) => setEditNodeDetail(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditNodeOpen(false)}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* ── Add Node Modal (Rendered via Portal) ────────────────────── */}
        {mounted &&
          isAddNodeOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
              onClick={() => setIsAddNodeOpen(false)}
            >
              <div
                className="relative w-full max-w-md my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Add Topology Entity</h2>
                    <p className="text-xs text-slate-500">Insert a new node into the active cyber mesh</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddNodeOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddNode} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entity Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S7 PLC Guard, Modbus AI, Vault CA"
                    value={newNodeLabel}
                    onChange={(e) => setNewNodeLabel(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category (Kind)</label>
                    <select
                      value={newNodeKind}
                      onChange={(e) => {
                        const nextKind = e.target.value as NodeKind;
                        setNewNodeKind(nextKind);
                        // If choosing pillar, auto set parent to root
                        if (nextKind === 'pillar' && rootNodeIds.length > 0) {
                          setNewNodeParent(rootNodeIds[0]);
                        }
                      }}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400 text-xs"
                    >
                      <option value="pillar">Pillar (Domain Hub)</option>
                      <option value="agent">Agent (AI Sentinel)</option>
                      <option value="task">Task (Job/Enforcer)</option>
                      <option value="tool">Tool (Integration)</option>
                      <option value="human">Operator (Human)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status</label>
                    <input
                      type="text"
                      placeholder="e.g. Operational, Running"
                      value={newNodeStatus}
                      onChange={(e) => setNewNodeStatus(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Connect to Parent Node</label>
                  <select
                    value={newNodeParent}
                    onChange={(e) => setNewNodeParent(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400 text-xs"
                  >
                    {allNodes.map((n) => {
                      const d = n.data as unknown as CustomNodeData;
                      return (
                        <option key={n.id} value={n.id}>
                          {d.label} ({d.kind})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description of this security component..."
                    value={newNodeDetail}
                    onChange={(e) => setNewNodeDetail(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddNodeOpen(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Create Entity
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

export default function FlowGraph() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
