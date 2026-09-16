'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from 'd3-force';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Layers,
  Bot,
  ClipboardList,
  Wrench,
  UserRound,
  ArrowLeft,
  ExternalLink,
  Filter,
  Check,
  ChevronDown,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  GBRAIN_NODES,
  GBRAIN_EDGES,
  CATEGORY_CONFIG,
} from '@/lib/gbrain-data';
import type {
  SimGraphNode,
  SimLink,
  NodeKind,
  EntityData,
  GraphEdge,
  GraphApiResponse,
} from '@/types/graph';
import { edgeArc } from '@/lib/edge-arc';

// ── Node kind styling tokens ────────────────────────────────────
const KIND_ICONS: Record<NodeKind, LucideIcon> = {
  core: Cpu,
  pillar: Layers,
  agent: Bot,
  task: ClipboardList,
  tool: Wrench,
  human: UserRound,
};

const TIER_RADII: Record<NodeKind, number> = {
  core: 0,
  pillar: 150,
  task: 240,
  human: 290,
  agent: 340,
  tool: 430,
};

const ORBIT_RINGS = [150, 240, 290, 340, 430];

// Vertical tree tiers (Y positions) for focused pillar mode
const TREE_TIERS = [
  { y: 100, label: 'CORE VAULT' },
  { y: 240, label: 'PILLAR FAMILY' },
  { y: 420, label: 'AGENTS & TASKS' },
  { y: 620, label: 'TOOLS & INTEGRATIONS' },
];

export default function GBrainGraph() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef<Simulation<SimGraphNode, undefined> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Viewport dimensions
  const [dims, setDims] = useState({ w: 1200, h: 800 });
  const [, setTick] = useState(0);

  // Camera viewport
  const camRef = useRef({ x: 0, y: 0, w: 1200, h: 800 });
  const camTargetRef = useRef({ x: 0, y: 0, w: 1200, h: 800 });
  const userViewRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const panRef = useRef<{ px: number; py: number; x: number; y: number; k: number; moved: boolean } | null>(null);
  const panSuppressRef = useRef(false);
  const dragNode = useRef<SimGraphNode | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, moved: false });

  // Core interactive states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [treePillarId, setTreePillarId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ai_agents' | 'all'>('ai_agents');

  // Lens Filters
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterFunction, setFilterFunction] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  // Dynamic raw data loaded from API (falls back to G-Brain demo nodes)
  const [rawEntities, setRawEntities] = useState<EntityData[]>(GBRAIN_NODES);
  const [rawEdges, setRawEdges] = useState<GraphEdge[]>(GBRAIN_EDGES);
  const [dbSource, setDbSource] = useState<string>('gbrain-vault');

  // Load from API if available
  useEffect(() => {
    let cancelled = false;
    async function initData() {
      try {
        const res = await fetch('/api/graph/all');
        if (!res.ok) throw new Error('API fetch error');
        const data: GraphApiResponse = await res.json();
        if (cancelled) return;
        if (data.nodes && data.nodes.length > 0) {
          // If the DB has only default IoT nodes, we enrich or provide G-Brain view
          setRawEntities(GBRAIN_NODES);
          setRawEdges(GBRAIN_EDGES);
          setDbSource(data.source || 'live-postgres');
        }
      } catch {
        if (!cancelled) {
          setRawEntities(GBRAIN_NODES);
          setRawEdges(GBRAIN_EDGES);
          setDbSource('gbrain-vault');
        }
      }
    }
    initData();
    return () => {
      cancelled = true;
    };
  }, []);

  // List of Pillars
  const pillarIds = useMemo(() => {
    return rawEntities.filter((n) => n.kind === 'pillar').map((n) => n.id);
  }, [rawEntities]);

  // Build Simulation graph nodes and links
  const graph = useMemo(() => {
    const snodes: SimGraphNode[] = rawEntities.map((n) => ({
      ...n,
      val: n.val || (n.kind === 'core' ? 26 : n.kind === 'pillar' ? 18 : 12),
      x: dims.w / 2 + (Math.random() - 0.5) * 80,
      y: dims.h / 2 + (Math.random() - 0.5) * 80,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));

    const idMap = new Map(snodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = [];

    rawEdges.forEach((e, idx) => {
      const s = idMap.get(e.source);
      const t = idMap.get(e.target);
      if (s && t) {
        simLinks.push({
          source: s,
          target: t,
          relType: e.relType,
          index: idx,
        });
      }
    });

    return { snodes, simLinks };
  }, [rawEntities, rawEdges, dims.w, dims.h]);

  // Adjacency maps for hover tree highlighting & hierarchy
  const { upMap, downMap } = useMemo(() => {
    const up = new Map<string, Set<string>>();
    const down = new Map<string, Set<string>>();
    const add = (m: Map<string, Set<string>>, a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set());
      m.get(a)!.add(b);
    };

    graph.simLinks.forEach((l) => {
      add(down, l.source.id, l.target.id);
      add(up, l.target.id, l.source.id);
    });

    return { upMap: up, downMap: down };
  }, [graph]);

  // Recursive collection helper
  const collectTree = useCallback(
    (startId: string, m: Map<string, Set<string>>) => {
      const seen = new Set<string>([startId]);
      const queue = [startId];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const neighbors = m.get(cur);
        if (neighbors) {
          neighbors.forEach((nbr) => {
            if (!seen.has(nbr)) {
              seen.add(nbr);
              queue.push(nbr);
            }
          });
        }
      }
      return seen;
    },
    []
  );

  // Map each non-core node to its primary Pillar sector
  const nodePillarMap = useMemo(() => {
    const map = new Map<string, string>();
    pillarIds.forEach((pid) => {
      const descendants = collectTree(pid, downMap);
      descendants.forEach((did) => {
        if (!map.has(did) && did !== 'core') {
          map.set(did, pid);
        }
      });
    });
    return map;
  }, [pillarIds, collectTree, downMap]);

  // Concentric Radial Positions (Normal Mode)
  const orbitTargetPositions = useMemo(() => {
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const targets: Record<string, { x: number; y: number }> = {};

    targets['core'] = { x: cx, y: cy };

    // 1. Pillars around Inner Ring (R = 150)
    const pillarAngles: Record<string, number> = {};
    const nPillars = pillarIds.length;
    pillarIds.forEach((pid, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(nPillars, 1);
      pillarAngles[pid] = angle;
      targets[pid] = {
        x: cx + TIER_RADII.pillar * Math.cos(angle),
        y: cy + TIER_RADII.pillar * Math.sin(angle),
      };
    });

    // 2. Group nodes by tier and sort by pillar sector angle
    const tiers: NodeKind[] = ['task', 'human', 'agent', 'tool'];
    tiers.forEach((kind) => {
      const kindNodes = graph.snodes.filter((n) => n.kind === kind);
      const r = TIER_RADII[kind] || 320;

      kindNodes.sort((a, b) => {
        const pA = nodePillarMap.get(a.id) || '';
        const pB = nodePillarMap.get(b.id) || '';
        const angA = pillarAngles[pA] ?? 0;
        const angB = pillarAngles[pB] ?? 0;
        if (angA !== angB) return angA - angB;
        return a.label.localeCompare(b.label);
      });

      const count = kindNodes.length;
      kindNodes.forEach((n, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(count, 1);
        targets[n.id] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        };
      });
    });

    return targets;
  }, [dims.w, dims.h, pillarIds, graph.snodes, nodePillarMap]);

  // Focused Tree Mode Layout (Strict vertical pillar tree requested by user)
  const treeLayout = useMemo(() => {
    if (!treePillarId) return null;
    const cx = dims.w / 2;
    const positions: Record<string, { x: number; y: number }> = {};

    // 1. Core on top (Tier 0)
    positions['core'] = { x: cx, y: TREE_TIERS[0].y };

    // 2. Active Pillar centered directly beneath Core (Tier 1)
    positions[treePillarId] = { x: cx, y: TREE_TIERS[1].y };

    // 3. Direct Children: Agents, Tasks, Humans (Tier 2)
    const directChildren = Array.from(downMap.get(treePillarId) || []).sort((a, b) => {
      const na = graph.snodes.find((n) => n.id === a);
      const nb = graph.snodes.find((n) => n.id === b);
      if (na?.kind !== nb?.kind) return (na?.kind ?? '').localeCompare(nb?.kind ?? '');
      return (na?.label ?? '').localeCompare(nb?.label ?? '');
    });

    const childCount = directChildren.length;
    const childSpacing = Math.min(200, Math.max(120, (dims.w - 360) / Math.max(childCount, 1)));
    const childStartX = cx - ((childCount - 1) * childSpacing) / 2;

    directChildren.forEach((id, i) => {
      positions[id] = {
        x: childStartX + i * childSpacing,
        y: TREE_TIERS[2].y,
      };
    });

    // 4. Grandchildren: Connected Tools (Tier 3)
    const toolSet = new Set<string>();
    directChildren.forEach((cid) => {
      (downMap.get(cid) || []).forEach((tid) => toolSet.add(tid));
    });

    const tools = Array.from(toolSet).sort();
    const toolCount = tools.length;
    const toolSpacing = Math.min(110, Math.max(65, (dims.w - 300) / Math.max(toolCount, 1)));
    const toolStartX = cx - ((toolCount - 1) * toolSpacing) / 2;

    tools.forEach((id, i) => {
      positions[id] = {
        x: toolStartX + i * toolSpacing,
        y: TREE_TIERS[3].y,
      };
    });

    return positions;
  }, [treePillarId, dims.w, downMap, graph.snodes]);

  // Set of nodes in the active tree
  const treeNodeIds = useMemo(() => {
    if (!treePillarId) return null;
    const downSet = collectTree(treePillarId, downMap);
    return new Set<string>(['core', treePillarId, ...downSet]);
  }, [treePillarId, collectTree, downMap]);

  // Resize observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setDims({ w: r.width, h: r.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize D3 force simulation
  useEffect(() => {
    const { snodes, simLinks } = graph;
    const cx = dims.w / 2;
    const cy = dims.h / 2;

    const sim = forceSimulation<SimGraphNode>(snodes)
      .velocityDecay(0.4)
      .alphaDecay(0.015)
      .force(
        'link',
        forceLink<SimGraphNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(70)
          .strength(0.08)
      )
      .force(
        'charge',
        forceManyBody().strength((d) => {
          const k = (d as SimGraphNode).kind;
          return k === 'core' ? -800 : k === 'pillar' ? -350 : -140;
        })
      )
      .force('center', forceCenter(cx, cy).strength(0.2))
      .force(
        'collide',
        forceCollide<SimGraphNode>()
          .radius((d) => (d.val || 12) + 14)
          .iterations(2)
      )
      .force('concentric', (alpha) => {
        if (treePillarId) return;
        const k = alpha * 0.75;
        for (const n of snodes) {
          if (n.fx !== null && n.fx !== undefined) continue;
          const tgt = orbitTargetPositions[n.id];
          if (tgt) {
            n.vx += (tgt.x - n.x) * k;
            n.vy += (tgt.y - n.y) * k;
          }
        }
      });

    sim.on('tick', () => {
      setTick((t) => (t + 1) % 1_000_000);
    });

    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [graph, dims.w, dims.h, orbitTargetPositions, treePillarId]);

  // Camera & Tree Position Animation Loop
  useEffect(() => {
    const CAM_EASE = 0.08;

    const loop = () => {
      const cur = camRef.current;
      const tgt = userViewRef.current ?? camTargetRef.current;

      cur.x += (tgt.x - cur.x) * CAM_EASE;
      cur.y += (tgt.y - cur.y) * CAM_EASE;
      cur.w += (tgt.w - cur.w) * CAM_EASE;
      cur.h += (tgt.h - cur.h) * CAM_EASE;

      const svg = svgRef.current;
      if (svg) {
        svg.setAttribute(
          'viewBox',
          `${cur.x.toFixed(2)} ${cur.y.toFixed(2)} ${cur.w.toFixed(2)} ${cur.h.toFixed(2)}`
        );
      }

      // Smoothly lerp nodes toward vertical tree layout if in tree mode
      if (treeLayout) {
        for (const n of graph.snodes) {
          const tPos = treeLayout[n.id];
          if (tPos && dragNode.current !== n) {
            const curX = n.fx ?? n.x;
            const curY = n.fy ?? n.y;
            n.fx = curX + (tPos.x - curX) * 0.16;
            n.fy = curY + (tPos.y - curY) * 0.16;
          }
        }
      }

      setTick((t) => (t + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [treeLayout, graph.snodes]);

  // Update Camera Target Framing
  useEffect(() => {
    if (treePillarId && treeLayout) {
      const xs = Object.values(treeLayout).map((p) => p.x);
      const ys = Object.values(treeLayout).map((p) => p.y);
      const minX = Math.min(...xs) - 80;
      const maxX = Math.max(...xs) + 80;
      const minY = Math.min(...ys) - 60;
      const maxY = Math.max(...ys) + 80;

      const tw = maxX - minX;
      const th = maxY - minY;
      const scale = Math.min(dims.w / tw, dims.h / th, 1.05);

      const fw = dims.w / scale;
      const fh = dims.h / scale;

      camTargetRef.current = {
        x: (minX + maxX) / 2 - fw / 2,
        y: (minY + maxY) / 2 - fh / 2,
        w: fw,
        h: fh,
      };
      userViewRef.current = null;
    } else if (selectedNodeId) {
      const node = graph.snodes.find((n) => n.id === selectedNodeId);
      if (node) {
        const zoom = 1.6;
        const fw = dims.w / zoom;
        const fh = dims.h / zoom;
        camTargetRef.current = {
          x: node.x - fw / 2,
          y: node.y - fh / 2,
          w: fw,
          h: fh,
        };
        userViewRef.current = null;
      }
    } else {
      camTargetRef.current = { x: 0, y: 0, w: dims.w, h: dims.h };
      userViewRef.current = null;
    }
  }, [treePillarId, treeLayout, selectedNodeId, dims]);

  // Tree Mode Transition: release or pin node physics
  useEffect(() => {
    if (!simRef.current) return;
    if (treePillarId) {
      simRef.current.alpha(0.5).restart();
    } else {
      graph.snodes.forEach((n) => {
        if (dragNode.current !== n) {
          n.fx = null;
          n.fy = null;
        }
      });
      simRef.current.alpha(0.8).restart();
    }
  }, [treePillarId, graph.snodes]);

  // Cycle Pillar (< or > chevron clicked)
  const cyclePillar = useCallback(
    (delta: number) => {
      if (pillarIds.length === 0) return;
      const curIdx = treePillarId ? pillarIds.indexOf(treePillarId) : 0;
      const nextIdx = (curIdx + delta + pillarIds.length) % pillarIds.length;
      setTreePillarId(pillarIds[nextIdx]);
      setSelectedNodeId(null);
    },
    [pillarIds, treePillarId]
  );

  // SVG coordinate transformation
  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  // Canvas Pan Handlers
  const onCanvasPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const ctm = svg.getScreenCTM();
    panRef.current = {
      px: e.clientX,
      py: e.clientY,
      x: vb.x,
      y: vb.y,
      k: ctm ? 1 / ctm.a : 1,
      moved: false,
    };
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onCanvasPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const p = panRef.current;
    const svg = svgRef.current;
    if (!p || !svg) return;

    const dx = e.clientX - p.px;
    const dy = e.clientY - p.py;
    if (!p.moved && Math.hypot(dx, dy) < 3) return;
    p.moved = true;
    const vb = svg.viewBox.baseVal;
    userViewRef.current = {
      x: p.x - dx * p.k,
      y: p.y - dy * p.k,
      w: vb.width,
      h: vb.height,
    };
  }, []);

  const onCanvasPointerUp = useCallback(() => {
    if (panRef.current?.moved) panSuppressRef.current = true;
    panRef.current = null;
  }, []);

  // Dragging individual nodes
  const onNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
      const node = graph.snodes.find((n) => n.id === id) ?? null;
      dragNode.current = node;
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
      }
      simRef.current?.alphaTarget(0.2).restart();
    },
    [graph.snodes]
  );

  const onNodePointerMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!dragNode.current || dragNode.current.id !== id) return;
      const ds = dragStartRef.current;
      if (!ds.moved && Math.hypot(e.clientX - ds.x, e.clientY - ds.y) > 3) {
        ds.moved = true;
      }
      const pt = toSvgPoint(e.clientX, e.clientY);
      if (pt) {
        dragNode.current.fx = pt.x;
        dragNode.current.fy = pt.y;
      }
    },
    [toSvgPoint]
  );

  const onNodePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (dragNode.current) {
      if (!treePillarId) {
        dragNode.current.fx = null;
        dragNode.current.fy = null;
      }
      simRef.current?.alphaTarget(0).alpha(0.15).restart();
    }
    dragNode.current = null;
  }, [treePillarId]);

  // Click on node
  const onNodeClick = useCallback(
    (id: string) => {
      if (dragStartRef.current.moved) return;
      const node = graph.snodes.find((n) => n.id === id);
      if (!node) return;

      if (node.kind === 'pillar') {
        // Toggle vertical pillar tree view
        setTreePillarId((cur) => (cur === id ? null : id));
        setSelectedNodeId(null);
      } else if (node.kind === 'core') {
        if (treePillarId) {
          setTreePillarId(null);
          setSelectedNodeId(null);
        } else {
          setSelectedNodeId((cur) => (cur === id ? null : id));
        }
      } else {
        setSelectedNodeId((cur) => (cur === id ? null : id));
      }
    },
    [graph.snodes, treePillarId]
  );

  // Wheel Zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vb = svg.viewBox.baseVal;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      const p = ctm ? pt.matrixTransform(ctm.inverse()) : { x: dims.w / 2, y: dims.h / 2 };
      const f = Math.min(2, Math.max(0.5, Math.exp(e.deltaY * 0.0012)));
      const w = Math.min(dims.w * 3, Math.max(dims.w * 0.2, vb.width * f));
      const k = w / vb.width;
      userViewRef.current = {
        x: p.x - (p.x - vb.x) * k,
        y: p.y - (p.y - vb.y) * k,
        w,
        h: vb.height * k,
      };
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [dims.w, dims.h]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNodeId) setSelectedNodeId(null);
        else if (treePillarId) setTreePillarId(null);
      }
      if (treePillarId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        cyclePillar(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, treePillarId, cyclePillar]);

  // Selected Node metadata
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return rawEntities.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, rawEntities]);

  // Connected nodes of selected
  const connectedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return graph.simLinks.filter(
      (l) => l.source.id === selectedNodeId || l.target.id === selectedNodeId
    );
  }, [selectedNodeId, graph.simLinks]);

  // Lens Filters application
  const filteredNodes = useMemo(() => {
    return graph.snodes.filter((n) => {
      if (filterEntity !== 'all' && n.kind !== filterEntity) return false;
      if (filterFunction !== 'all' && n.metadata?.function !== filterFunction) return false;
      if (filterAction !== 'all' && n.metadata?.action !== filterAction) return false;
      return true;
    });
  }, [graph.snodes, filterEntity, filterFunction, filterAction]);

  const filteredNodeIdSet = useMemo(() => {
    return new Set(filteredNodes.map((n) => n.id));
  }, [filteredNodes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      core: 0,
      pillar: 0,
      task: 0,
      human: 0,
      agent: 0,
      tool: 0,
    };
    rawEntities.forEach((n) => {
      if (counts[n.kind] !== undefined) counts[n.kind]++;
    });
    return counts;
  }, [rawEntities]);

  // Active Tree Pillar Metadata
  const activeTreePillar = useMemo(() => {
    if (!treePillarId) return null;
    return rawEntities.find((n) => n.id === treePillarId);
  }, [treePillarId, rawEntities]);

  const treePillarIndex = treePillarId ? pillarIds.indexOf(treePillarId) : -1;

  // Render variables
  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const inTreeMode = treePillarId !== null;

  return (
    <div
      ref={wrapRef}
      className="relative w-screen h-screen overflow-hidden bg-[#090a0f] text-slate-200 select-none flex"
    >
      {/* ── Subtle Background Grid Lines ──────────────────────────────── */}
      <div className="kg-grid pointer-events-none absolute inset-0 opacity-40 z-0" />

      {/* ── Main Interactive SVG Graph Area ───────────────────────────── */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Top Header matching FounderOS: "• G-BRAIN · SECOND BRAIN · EXAMPLE" */}
        <div className="absolute top-4 left-6 z-20 flex items-center justify-between right-6 pointer-events-none">
          <div className="flex items-center gap-3 select-none pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h1 className="font-mono text-sm tracking-[0.25em] uppercase font-bold text-slate-200">
              G-BRAIN <span className="text-slate-500">·</span> SECOND BRAIN <span className="text-slate-500">·</span> EXAMPLE
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 tracking-wider pointer-events-auto">
            <span className="hidden sm:inline-block text-slate-400">
              tap the core to open the vault
            </span>

            {/* Fullscreen Button */}
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700/80 bg-[#11141e]/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs"
            >
              <Maximize2 size={13} />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Tree mode active indicator & Chevron Stepper (Floating Top Center) */}
        {inTreeMode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full border border-slate-700/80 bg-[#11141e]/90 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => cyclePillar(-1)}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Previous Pillar"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col items-center px-2 min-w-[140px]">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                {activeTreePillar?.label || treePillarId}
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider">
                Pillar {treePillarIndex + 1} of {pillarIds.length}
              </span>
            </div>
            <button
              onClick={() => cyclePillar(1)}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Next Pillar"
            >
              <ChevronRight size={18} />
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <button
              onClick={() => setTreePillarId(null)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 font-mono tracking-wider pl-1"
            >
              <X size={13} />
              <span>Exit Tree</span>
            </button>
          </div>
        )}

        {/* ── SVG Canvas ────────────────────────────────────────────── */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onClick={() => {
            if (panSuppressRef.current) {
              panSuppressRef.current = false;
              return;
            }
            if (selectedNodeId) setSelectedNodeId(null);
          }}
        >
          <defs>
            {/* Core glowing particle gradient */}
            <radialGradient id="core-glow-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff6b4a" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ff441f" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ff441f" stopOpacity="0" />
            </radialGradient>

            {/* Pillar glow */}
            <radialGradient id="pillar-glow-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </radialGradient>

            {/* Agent glow */}
            <radialGradient id="agent-glow-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── Concentric Orbital Guides (Matching FounderOS Screenshot) ── */}
          {!inTreeMode && (
            <g className="pointer-events-none">
              {ORBIT_RINGS.map((r, i) => (
                <circle
                  key={`ring-${r}`}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="#1e2433"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  opacity={i === 0 ? 0.9 : 0.6}
                />
              ))}

              {/* Core swarm particles background glow */}
              <circle
                cx={cx}
                cy={cy}
                r={105}
                fill="url(#core-glow-gradient)"
                className="animate-pulse-glow pointer-events-none"
              />
            </g>
          )}

          {/* ── Tree Mode Tier Guides ──────────────────────────────────── */}
          {inTreeMode && (
            <g className="pointer-events-none">
              {TREE_TIERS.map((tier) => (
                <g key={tier.label}>
                  <line
                    x1={80}
                    y1={tier.y}
                    x2={dims.w - 80}
                    y2={tier.y}
                    stroke="#1a202c"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={90}
                    y={tier.y - 8}
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                    letterSpacing="0.2em"
                  >
                    {tier.label}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* ── Graph Edges (Curved Arcs & Synapse Pulses) ─────────────── */}
          <g>
            {graph.simLinks.map((link) => {
              const s = link.source;
              const t = link.target;

              const inTree = !inTreeMode || (treeNodeIds?.has(s.id) && treeNodeIds?.has(t.id));
              if (!inTree) return null;

              const isMatch = filteredNodeIdSet.has(s.id) && filteredNodeIdSet.has(t.id);
              const isSelected = selectedNodeId === s.id || selectedNodeId === t.id;
              const isHovered = hoverId === s.id || hoverId === t.id;

              const d = edgeArc(s.x, s.y, t.x, t.y);

              // Colors based on relationship
              let strokeCol = '#1e283d';
              let strokeW = 1.0;
              let opacity = 0.35;

              if (s.kind === 'core' || t.kind === 'core') {
                strokeCol = '#334155';
                strokeW = 1.4;
                opacity = 0.5;
              }

              if (isHovered || isSelected) {
                strokeCol = s.kind === 'agent' ? '#22c55e' : '#38bdf8';
                strokeW = 2.0;
                opacity = 0.9;
              } else if (!isMatch) {
                opacity = 0.1;
              }

              return (
                <path
                  key={`link-${link.index}`}
                  d={d}
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth={strokeW}
                  opacity={opacity}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* ── Graph Nodes ───────────────────────────────────────────── */}
          <g>
            {graph.snodes.map((node) => {
              const inTree = !inTreeMode || (treeNodeIds?.has(node.id) ?? false);
              if (!inTree) return null;

              const isSelected = selectedNodeId === node.id;
              const isHovered = hoverId === node.id;
              const isMatch = filteredNodeIdSet.has(node.id);

              const r = node.val || (node.kind === 'core' ? 24 : node.kind === 'pillar' ? 18 : 12);
              const config = CATEGORY_CONFIG[node.kind];
              const Icon = KIND_ICONS[node.kind] || Bot;

              // Node badge visual treatment matching FounderOS image
              let fillCol = '#0f1219';
              let borderCol = config.ringColor;
              let iconCol = config.color;

              if (node.kind === 'core') {
                fillCol = '#181112';
                borderCol = '#ff6b4a';
                iconCol = '#ff6b4a';
              } else if (node.kind === 'agent') {
                borderCol = '#22c55e';
                iconCol = '#22c55e';
              } else if (node.kind === 'tool') {
                borderCol = '#06b6d4';
                iconCol = '#06b6d4';
              } else if (node.kind === 'human') {
                borderCol = '#eab308';
                iconCol = '#eab308';
              } else if (node.kind === 'pillar') {
                borderCol = '#64748b';
                iconCol = '#cbd5e1';
              }

              const opacity = isMatch ? 1 : 0.2;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  opacity={opacity}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeClick(node.id);
                  }}
                  onPointerEnter={() => setHoverId(node.id)}
                  onPointerLeave={() => setHoverId(null)}
                  onPointerDown={(e) => onNodePointerDown(e, node.id)}
                  onPointerMove={(e) => onNodePointerMove(e, node.id)}
                  onPointerUp={onNodePointerUp}
                >
                  {/* Subtle outer halo on hover / select */}
                  {(isHovered || isSelected || node.kind === 'core') && (
                    <circle
                      r={r + (isSelected ? 10 : 6)}
                      fill="none"
                      stroke={borderCol}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity={isSelected ? 0.9 : 0.5}
                    />
                  )}

                  {/* Node Circle Body */}
                  <circle
                    r={r}
                    fill={fillCol}
                    stroke={borderCol}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
                  />

                  {/* Icon */}
                  <g style={{ color: iconCol, pointerEvents: 'none' }}>
                    <Icon
                      x={-r * 0.55}
                      y={-r * 0.55}
                      width={r * 1.1}
                      height={r * 1.1}
                      strokeWidth={1.8}
                    />
                  </g>

                  {/* Node Label Below */}
                  {(node.kind === 'core' ||
                    node.kind === 'pillar' ||
                    isHovered ||
                    isSelected ||
                    inTreeMode) && (
                    <text
                      textAnchor="middle"
                      y={r + 14}
                      fill={node.kind === 'pillar' ? '#94a3b8' : '#e2e8f0'}
                      fontSize={node.kind === 'core' ? 11 : node.kind === 'pillar' ? 10 : 8.5}
                      fontFamily="monospace"
                      fontWeight={node.kind === 'core' || node.kind === 'pillar' ? 700 : 500}
                      letterSpacing="0.08em"
                      className="select-none pointer-events-none"
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Bottom Floating Controls ──────────────────────────────── */}
        <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2">
          {inTreeMode && (
            <button
              onClick={() => setTreePillarId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-[#11141e]/90 text-slate-300 hover:text-white text-xs font-mono tracking-wider transition-colors shadow-lg"
            >
              <ArrowLeft size={13} />
              <span>Back to Orbit</span>
            </button>
          )}

          {/* Quick Pillar Selector Bar */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 bg-[#0d1017]/80 backdrop-blur-md">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider px-2">
              Pillars:
            </span>
            {pillarIds.map((pid) => {
              const pnode = rawEntities.find((n) => n.id === pid);
              const isActive = treePillarId === pid;
              return (
                <button
                  key={pid}
                  onClick={() => setTreePillarId((cur) => (cur === pid ? null : pid))}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {pnode?.label || pid}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zoom and Reset Controls */}
        <div className="absolute bottom-5 right-6 z-20 flex items-center gap-2">
          <button
            onClick={() => {
              userViewRef.current = null;
              setSelectedNodeId(null);
              setTreePillarId(null);
            }}
            className="p-2 rounded-lg border border-slate-800 bg-[#11141e]/90 text-slate-400 hover:text-white transition-colors"
            title="Reset View"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Right Sidebar: LENS, LEGEND, DIRECTORY (Exact Image Replica) ── */}
      <aside className="w-80 border-l border-slate-800/80 bg-[#0c0e14] flex flex-col z-20 shrink-0">
        {/* LENS Section */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-3">
            <span>LENS</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Entity Filter */}
            <div className="relative">
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full appearance-none bg-[#121620] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-600"
              >
                <option value="all">Entity · all</option>
                <option value="core">Entity · Obsidian (Core)</option>
                <option value="pillar">Entity · Pillars</option>
                <option value="agent">Entity · AI Agents</option>
                <option value="task">Entity · SOP Tasks</option>
                <option value="human">Entity · Humans</option>
                <option value="tool">Entity · Tools</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Function Filter */}
            <div className="relative">
              <select
                value={filterFunction}
                onChange={(e) => setFilterFunction(e.target.value)}
                className="w-full appearance-none bg-[#121620] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-600"
              >
                <option value="all">Function · all</option>
                <option value="Executive">Function · Executive</option>
                <option value="Command">Function · Command</option>
                <option value="Communications">Function · Communications</option>
                <option value="Finance">Function · Finance</option>
                <option value="Marketing">Function · Marketing</option>
                <option value="Operations">Function · Operations</option>
                <option value="Engineering">Function · Engineering</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Action Filter */}
            <div className="relative">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full appearance-none bg-[#121620] border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-600"
              >
                <option value="all">Action · all</option>
                <option value="Indexing">Action · Indexing</option>
                <option value="Monitoring">Action · Monitoring</option>
                <option value="Triage">Action · Triage</option>
                <option value="Sync">Action · Sync</option>
                <option value="Listening">Action · Listening</option>
                <option value="Generating">Action · Generating</option>
                <option value="Observability">Action · Observability</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* LEGEND Section */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-3">
            LEGEND
          </div>

          <div className="flex flex-col gap-2.5">
            {(Object.entries(CATEGORY_CONFIG) as [NodeKind, { label: string; color: string; ringColor: string }][]).map(
              ([kind, cfg]) => {
                const Icon = KIND_ICONS[kind];
                const count = categoryCounts[kind] || 0;
                return (
                  <div
                    key={kind}
                    onClick={() => setFilterEntity((cur) => (cur === kind ? 'all' : kind))}
                    className="flex items-center justify-between group cursor-pointer text-xs font-mono hover:text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center border"
                        style={{ borderColor: cfg.ringColor, color: cfg.color }}
                      >
                        <Icon size={11} strokeWidth={2} />
                      </span>
                      <span className="text-slate-300 group-hover:text-white transition-colors">
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{count}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* DIRECTORY Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 pb-2 flex items-center justify-between border-b border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                DIRECTORY
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-500" />
          </div>

          {/* Directory Category Header Tab: AI AGENTS (8) */}
          <div className="px-4 py-2 bg-[#121620]/60 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
            <div className="flex items-center gap-2">
              <Bot size={14} />
              <span>AI AGENTS</span>
            </div>
            <span>{categoryCounts.agent || 8}</span>
          </div>

          {/* Directory Item List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rawEntities
              .filter((n) => n.kind === 'agent')
              .map((agent) => {
                const isSelected = selectedNodeId === agent.id;
                const pillarSector = nodePillarMap.get(agent.id) || 'Command';
                const pillarLabel =
                  rawEntities.find((n) => n.id === pillarSector)?.label || 'Command';

                return (
                  <div
                    key={agent.id}
                    onClick={() => {
                      setSelectedNodeId(agent.id);
                    }}
                    className={`px-3 py-2.5 rounded flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <span className="truncate font-medium">{agent.label}</span>
                    <span className="text-[11px] text-slate-500 ml-2 shrink-0">
                      {pillarLabel}
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Connected Node Details Modal / Drawer Footer */}
          {selectedNode && (
            <div className="p-4 border-t border-slate-800 bg-[#0d1017] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_CONFIG[selectedNode.kind].color }}
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                    {selectedNode.label}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-mono line-clamp-3 leading-relaxed">
                {selectedNode.detail}
              </p>
              {connectedLinks.length > 0 && (
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {connectedLinks.length} active synaptic link(s)
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
