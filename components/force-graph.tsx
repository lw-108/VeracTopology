'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from 'd3-force';
import {
  X, ZoomIn, ZoomOut, Maximize, Activity, ChevronLeft, ChevronRight,
  Cpu, Layers, Bot, ClipboardList, Wrench, UserRound, ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { nodes as rawNodes, links as rawLinks, COLORS as RAW_COLORS, nodeMeta } from '@/lib/graph-data';
import type { SimGraphNode, SimLink, NodeKind } from '@/types/graph';
import { edgeArc } from '@/lib/edge-arc';

// ── Design tokens (Minimal White Light Mode) ──────────────────────────────────
const LIGHT_COLORS: Record<string, string> = {
  core:   '#0f172a',   // Dark slate center
  pillar: '#7c3aed',   // Purple pillar default
  agent:  '#0284c7',   // Sky blue agent
  task:   '#64748b',   // Slate task
  tool:   '#e11d48',   // Red tool
  human:  '#d97706',   // Amber human
};
const COLORS = LIGHT_COLORS;

// Node categories: icon + radius per tier
const CAT: Record<NodeKind, { Icon: LucideIcon; r: number }> = {
  core:   { Icon: Cpu,           r: 24 },
  pillar: { Icon: Layers,        r: 18 },
  agent:  { Icon: Bot,           r: 12 },
  task:   { Icon: ClipboardList, r: 10 },
  tool:   { Icon: Wrench,        r: 10 },
  human:  { Icon: UserRound,     r: 12 },
};

const PILLAR_IDS = rawNodes.filter((n) => n.kind === 'pillar').map((n) => n.id);

// Tier radii for the concentric orbital ring system
const TIER_RADII: Record<string, number> = {
  core: 0,
  pillar: 170,
  task: 270,
  agent: 370,
  human: 370,
  tool: 470,
};

// Tree mode tier positions (Y offsets in SVG space)
const TREE_TIERS = [
  { y: 80,  label: 'CORE'        },
  { y: 230, label: 'PILLAR'      },
  { y: 420, label: 'AGENTS & TASKS' },
  { y: 600, label: 'TOOLS'       },
];

// Orbital ring radii (concentric guides matching reference image)
const ORBIT_RINGS = [170, 270, 370, 470, 530];

// Idle frame throttle
const IDLE_MS = 15_000;

function radiusOf(n: { kind: NodeKind; val?: number }) {
  return CAT[n.kind]?.r ?? (n.val ?? 10);
}
function colorOf(kind: NodeKind, override?: string) {
  return override ?? COLORS[kind] ?? '#64748b';
}

/** Quadratic bezier branch path for focused tree mode */
function branchPath(
  sx: number, sy: number,
  tx: number, ty: number,
): string {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2 + (ty - sy) * 0.18;
  return `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;
}

/** Depth-based branch stroke width */
function branchWidth(depth: number): number {
  return depth === 1 ? 2.2 : depth === 2 ? 1.6 : depth === 3 ? 1.3 : 1;
}

export default function ForceGraph() {
  const svgRef  = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const simRef  = useRef<Simulation<SimGraphNode, undefined> | null>(null);
  const rafRef  = useRef<number | null>(null);

  // Camera — viewBox-based
  const camRef = useRef({ x: 0, y: 0, w: 1200, h: 800 });
  const camTargetRef = useRef({ x: 0, y: 0, w: 1200, h: 800 });
  const userViewRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const panRef  = useRef<{ px: number; py: number; x: number; y: number; k: number; moved: boolean } | null>(null);
  const panSuppressRef = useRef(false);
  const dragNode = useRef<SimGraphNode | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, moved: false });

  // Animation
  const dashOffsetRef  = useRef(0);
  const lastActiveRef  = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const frameRef       = useRef(0);

  // Tree mode
  const treeTargetsRef = useRef<Record<string, { x: number; y: number }>>({});
  const prevTreePillarRef = useRef<string | null>(null);

  // Render state
  const [, setTick]       = useState(0);
  const [hoverId, setHoverId]         = useState<string | null>(null);
  const [treePillarId, setTreePillarId] = useState<string | null>(null);
  const [selected, setSelected]       = useState<string | null>(null);
  const [dims, setDims]               = useState({ w: 1200, h: 800 });

  // Build sim nodes + links once
  const graph = useMemo(() => {
    const snodes: SimGraphNode[] = rawNodes.map((n) => ({
      ...n,
      x: n.x ?? 0,
      y: n.y ?? 0,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      color: colorOf(n.kind, n.color),
    }));
    const idMap = new Map(snodes.map((n) => [n.id, n]));
    const simLinks: (SimLink & { index: number })[] = [];
    rawLinks.forEach((l, i) => {
      const s = idMap.get(l.source);
      const t = idMap.get(l.target);
      if (s && t) simLinks.push({ source: s, target: t, label: l.label, index: i });
    });
    return { snodes, simLinks };
  }, []);

  // Adjacency for hover highlighting & tree mode
  const adjacency = useMemo(() => {
    const up   = new Map<string, Set<string>>();
    const down = new Map<string, Set<string>>();
    const add  = (m: Map<string, Set<string>>, a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set());
      m.get(a)!.add(b);
    };
    graph.simLinks.forEach((l) => {
      add(down, l.source.id, l.target.id);
      add(up, l.target.id, l.source.id);
    });
    const collect = (start: string, m: Map<string, Set<string>>) => {
      const seen = new Set<string>([start]);
      const stack = [start];
      while (stack.length) {
        const cur = stack.pop()!;
        const next = m.get(cur);
        if (next) next.forEach((n) => { if (!seen.has(n)) { seen.add(n); stack.push(n); } });
      }
      return seen;
    };
    return { up, down, collect };
  }, [graph]);

  const highlightSet = useMemo(() => {
    if (!hoverId) return null;
    const up   = adjacency.collect(hoverId, adjacency.up);
    const down = adjacency.collect(hoverId, adjacency.down);
    return new Set<string>([...up, ...down]);
  }, [hoverId, adjacency]);

  // Map each node to its primary pillar sector
  const nodePillarSector = useMemo(() => {
    const map = new Map<string, string>();
    PILLAR_IDS.forEach((pillarId) => {
      const descendants = adjacency.collect(pillarId, adjacency.down);
      descendants.forEach((id) => {
        if (!map.has(id) && id !== 'core') {
          map.set(id, pillarId);
        }
      });
    });
    return map;
  }, [adjacency]);

  // Compute exact concentric orbital target positions (tx, ty) around (cx, cy)
  const orbitTargetPositions = useMemo(() => {
    const centerX = dims.w / 2;
    const centerY = dims.h / 2;
    const targets: Record<string, { x: number; y: number }> = {};

    targets['core'] = { x: centerX, y: centerY };

    // 1. Position Pillars around Ring 1 (R = 170)
    const pillarAngles: Record<string, number> = {};
    const nPillars = PILLAR_IDS.length;
    // Start top (-PI/2) and rotate evenly
    PILLAR_IDS.forEach((pid, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / nPillars;
      pillarAngles[pid] = angle;
      targets[pid] = {
        x: centerX + TIER_RADII.pillar * Math.cos(angle),
        y: centerY + TIER_RADII.pillar * Math.sin(angle),
      };
    });

    // Group non-pillar nodes by (kind, pillarSector)
    const groups: Record<string, SimGraphNode[]> = {};
    graph.snodes.forEach((n) => {
      if (n.kind === 'core' || n.kind === 'pillar') return;
      const sector = nodePillarSector.get(n.id) || 'sales';
      const key = `${n.kind}:${sector}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    // For each tier (task, agent, human, tool), space nodes evenly on their orbital ring
    const tierKinds: NodeKind[][] = [['task'], ['agent', 'human'], ['tool']];

    tierKinds.forEach((kinds) => {
      const tierNodes = graph.snodes.filter((n) => kinds.includes(n.kind));
      const r = TIER_RADII[kinds[0]] || 370;
      
      // Sort nodes by their sector's pillar angle so connected nodes sit near their pillar sector
      tierNodes.sort((a, b) => {
        const pA = nodePillarSector.get(a.id) || 'sales';
        const pB = nodePillarSector.get(b.id) || 'sales';
        const angA = pillarAngles[pA] ?? 0;
        const angB = pillarAngles[pB] ?? 0;
        if (angA !== angB) return angA - angB;
        return a.label.localeCompare(b.label);
      });

      const count = tierNodes.length;
      tierNodes.forEach((n, i) => {
        const sectorPillar = nodePillarSector.get(n.id);
        const baseAngle = sectorPillar ? pillarAngles[sectorPillar] : 0;
        
        // Compute angle evenly around the ring, centered on sector pillar
        const totalSpan = (2 * Math.PI);
        const step = totalSpan / Math.max(count, 1);
        const angle = -Math.PI / 2 + i * step;

        targets[n.id] = {
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle),
        };
      });
    });

    return targets;
  }, [dims.w, dims.h, graph.snodes, nodePillarSector]);

  // Tree mode: which nodes belong to the active pillar's subtree
  const treeNodeIds = useMemo(() => {
    if (!treePillarId) return null;
    const downSet = adjacency.collect(treePillarId, adjacency.down);
    return new Set<string>(['core', treePillarId, ...downSet]);
  }, [treePillarId, adjacency]);

  // Tree mode: deterministic layout positions
  const treeLayout = useMemo(() => {
    if (!treePillarId) return null;
    const centerX = dims.w / 2;
    const positions: Record<string, { x: number; y: number }> = {};
    positions['core'] = { x: centerX, y: TREE_TIERS[0].y };
    positions[treePillarId] = { x: centerX, y: TREE_TIERS[1].y };

    const children = [...(adjacency.down.get(treePillarId) || [])].sort((a, b) => {
      const na = graph.snodes.find((n) => n.id === a);
      const nb = graph.snodes.find((n) => n.id === b);
      if (na?.kind !== nb?.kind) return (na?.kind ?? 'z').localeCompare(nb?.kind ?? 'z');
      return (na?.label ?? a).localeCompare(nb?.label ?? b);
    });
    const childCount   = children.length;
    const childSpacing = Math.min(220, Math.max(130, (dims.w - 300) / Math.max(childCount, 1)));
    const childStartX  = centerX - ((childCount - 1) * childSpacing) / 2;
    children.forEach((id, i) => {
      positions[id] = { x: childStartX + i * childSpacing, y: TREE_TIERS[2].y };
    });

    const toolSet = new Set<string>();
    children.forEach((childId) => {
      (adjacency.down.get(childId) || []).forEach((t) => toolSet.add(t));
    });
    const tools      = [...toolSet].sort();
    const toolCount  = tools.length;
    const toolSpacing = Math.min(110, Math.max(75, (dims.w - 200) / Math.max(toolCount, 1)));
    const toolStartX  = centerX - ((toolCount - 1) * toolSpacing) / 2;
    tools.forEach((id, i) => {
      positions[id] = { x: toolStartX + i * toolSpacing, y: TREE_TIERS[3].y };
    });
    return positions;
  }, [treePillarId, dims, adjacency, graph.snodes]);

  // Push tree targets into the ref for the animation loop
  useEffect(() => { treeTargetsRef.current = treeLayout ?? {}; }, [treeLayout]);

  // Camera target framing
  useEffect(() => {
    if (treePillarId && treeLayout) {
      const ys = Object.values(treeLayout).map((p) => p.y);
      const xs = Object.values(treeLayout).map((p) => p.x);
      const minX = Math.min(...xs) - 80;
      const maxX = Math.max(...xs) + 80;
      const minY = Math.min(...ys) - 60;
      const maxY = Math.max(...ys) + 80;
      const tw = maxX - minX;
      const th = maxY - minY;
      const scaleX = dims.w / tw;
      const scaleY = dims.h / th;
      const scale  = Math.min(scaleX, scaleY, 1.0);
      const fw = dims.w / scale;
      const fh = dims.h / scale;
      camTargetRef.current = {
        x: (minX + maxX) / 2 - fw / 2,
        y: (minY + maxY) / 2 - fh / 2,
        w: fw,
        h: fh,
      };
      userViewRef.current = null;
    } else if (selected) {
      const node = graph.snodes.find((n) => n.id === selected);
      if (node) {
        const zoom = 1.8;
        const fw = dims.w / zoom;
        const fh = dims.h / zoom;
        camTargetRef.current = { x: node.x - fw / 2, y: node.y - fh / 2, w: fw, h: fh };
        userViewRef.current = null;
      }
    } else {
      camTargetRef.current = { x: 0, y: 0, w: dims.w, h: dims.h };
      userViewRef.current = null;
    }
  }, [treePillarId, selected, dims, treeLayout, graph.snodes]);

  // Resize observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setDims({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // Initialize simulation with Concentric Orbit Attraction Force
  useEffect(() => {
    const { snodes, simLinks } = graph;
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const sim = forceSimulation<SimGraphNode>(snodes)
      .velocityDecay(0.4)
      .alphaDecay(0.012)
      .force('link', forceLink<SimGraphNode, SimLink & { index: number }>(simLinks)
        .id((d) => d.id)
        .distance((l) => {
          const s = l.source as SimGraphNode;
          const t = l.target as SimGraphNode;
          const tierSum = TIER_RADII[s.kind] + TIER_RADII[t.kind];
          return 60 + tierSum * 0.3;
        })
        .strength(0.05))
      .force('charge', forceManyBody().strength((d) => {
        const k = (d as SimGraphNode).kind;
        if (k === 'core')   return -1000;
        if (k === 'pillar') return -500;
        return -180;
      }))
      .force('center', forceCenter(cx, cy).strength(0.3))
      .force('collide', forceCollide<SimGraphNode>().radius((d) => radiusOf(d) + 12).iterations(3))
      // Concentric Orbit target position force
      .force('concentricOrbit', (alpha) => {
        if (treePillarIdRef.current) return;
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

    sim.on('tick', () => setTick((t) => (t + 1) % 1_000_000));
    simRef.current = sim;
    return () => { sim.stop(); };
  }, [graph, dims.w, dims.h, orbitTargetPositions]);

  // Main animation loop
  useEffect(() => {
    const CAM_EASE      = 0.08;
    const CAM_EASE_HOME = 0.3;
    const reduced =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const loop = () => {
      const now = performance.now();
      frameRef.current = (frameRef.current + 1) % 3;
      const idle = now - lastActiveRef.current > IDLE_MS && !treePillarIdRef.current && !selectedRef.current;
      if (idle && frameRef.current !== 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Camera glide
      const goingHome = !userViewRef.current && !treePillarIdRef.current && !selectedRef.current;
      const ease      = reduced ? 1 : goingHome ? CAM_EASE_HOME : CAM_EASE;
      const tgt       = userViewRef.current ?? camTargetRef.current;
      const cur       = camRef.current;
      cur.x += (tgt.x - cur.x) * ease;
      cur.y += (tgt.y - cur.y) * ease;
      cur.w += (tgt.w - cur.w) * ease;
      cur.h += (tgt.h - cur.h) * ease;
      const svg = svgRef.current;
      if (svg) {
        svg.setAttribute('viewBox', `${cur.x.toFixed(2)} ${cur.y.toFixed(2)} ${cur.w.toFixed(2)} ${cur.h.toFixed(2)}`);
      }

      // Dash offset animation
      dashOffsetRef.current -= 1.0;

      // Tree position lerp
      const targets = treeTargetsRef.current;
      if (Object.keys(targets).length > 0) {
        for (const n of graph.snodes) {
          const tgtPos = targets[n.id];
          if (tgtPos && dragNode.current !== n) {
            const curX = n.fx ?? n.x;
            const curY = n.fy ?? n.y;
            n.fx = curX + (tgtPos.x - curX) * 0.14;
            n.fy = curY + (tgtPos.y - curY) * 0.14;
          }
        }
      }

      setTick((t) => (t + 1) % 1_000_000);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    const wake = () => { lastActiveRef.current = performance.now(); };
    const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    for (const ev of WAKE_EVENTS) window.addEventListener(ev, wake, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      for (const ev of WAKE_EVENTS) window.removeEventListener(ev, wake);
    };
  }, [graph.snodes]);

  const treePillarIdRef = useRef(treePillarId);
  treePillarIdRef.current = treePillarId;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Tree mode enter / exit
  useEffect(() => {
    if (!simRef.current) return;
    const sim = simRef.current;
    const wasInTree = prevTreePillarRef.current !== null;
    const isInTree  = treePillarId !== null;
    if (!wasInTree && isInTree) {
      sim.alpha(0.5).restart();
    } else if (wasInTree && !isInTree) {
      treeTargetsRef.current = {};
      graph.snodes.forEach((n) => {
        if (dragNode.current !== n) { n.fx = null; n.fy = null; }
      });
      sim.alpha(0.8).restart();
    }
    prevTreePillarRef.current = treePillarId;
  }, [treePillarId, graph.snodes]);

  // Pointer interactions
  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  const nodeAt = useCallback((clientX: number, clientY: number) => {
    const p = toSvgPoint(clientX, clientY);
    if (!p) return null;
    for (let i = graph.snodes.length - 1; i >= 0; i--) {
      const n = graph.snodes[i];
      const r = radiusOf(n) + 6;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  }, [graph.snodes, toSvgPoint]);

  const onCanvasPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    lastActiveRef.current = performance.now();
    const svg = svgRef.current;
    if (!svg) return;
    const vb  = svg.viewBox.baseVal;
    const ctm = svg.getScreenCTM();
    panRef.current = { px: e.clientX, py: e.clientY, x: vb.x, y: vb.y, k: ctm ? 1 / ctm.a : 1, moved: false };
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch { /* best-effort */ }
  }, []);

  const onCanvasPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    lastActiveRef.current = performance.now();
    const p   = panRef.current;
    const svg = svgRef.current;
    if (!p || !svg) {
      if (!dragNode.current) {
        const hit = nodeAt(e.clientX, e.clientY);
        setHoverId(hit ? hit.id : null);
      }
      return;
    }
    const dx = e.clientX - p.px;
    const dy = e.clientY - p.py;
    if (!p.moved && Math.hypot(dx, dy) < 3) return;
    p.moved = true;
    const vb = svg.viewBox.baseVal;
    userViewRef.current = { x: p.x - dx * p.k, y: p.y - dy * p.k, w: vb.width, h: vb.height };
  }, [nodeAt]);

  const onCanvasPointerUp = useCallback(() => {
    if (panRef.current?.moved) panSuppressRef.current = true;
    panRef.current = null;
  }, []);

  const onNodePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    lastActiveRef.current = performance.now();
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch { /* best-effort */ }
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
    const node = graph.snodes.find((n) => n.id === id) ?? null;
    dragNode.current = node;
    if (node) { node.fx = node.x; node.fy = node.y; }
    simRef.current?.alphaTarget(0.2).restart();
  }, [graph.snodes]);

  const onNodePointerMove = useCallback((e: React.PointerEvent, id: string) => {
    if (!dragNode.current || dragNode.current.id !== id) return;
    const ds = dragStartRef.current;
    if (!ds.moved && Math.hypot(e.clientX - ds.x, e.clientY - ds.y) > 3) ds.moved = true;
    const p = toSvgPoint(e.clientX, e.clientY);
    if (p) { dragNode.current.fx = p.x; dragNode.current.fy = p.y; }
  }, [toSvgPoint]);

  const onNodePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (dragNode.current) {
      dragNode.current.fx = null;
      dragNode.current.fy = null;
      simRef.current?.alphaTarget(0).alpha(0.14).restart();
    }
    dragNode.current = null;
  }, []);

  const onNodeClick = useCallback((id: string) => {
    if (dragStartRef.current.moved) return;
    lastActiveRef.current = performance.now();
    const node = graph.snodes.find((n) => n.id === id);
    if (!node) return;
    if (node.kind === 'pillar') {
      setTreePillarId((cur) => (cur === id ? null : id));
      setSelected(null);
    } else if (node.kind === 'core' && treePillarId) {
      setTreePillarId(null);
      setSelected(null);
    } else {
      setSelected((cur) => (cur === id ? null : id));
    }
  }, [graph.snodes, treePillarId]);

  // Scroll wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      lastActiveRef.current = performance.now();
      const vb  = svg.viewBox.baseVal;
      const pt  = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      const p   = ctm ? pt.matrixTransform(ctm.inverse()) : { x: dims.w / 2, y: dims.h / 2 };
      const f   = Math.min(2, Math.max(0.5, Math.exp(e.deltaY * 0.0012)));
      const w   = Math.min(dims.w * 3, Math.max(dims.w * 0.15, vb.width * f));
      const k   = w / vb.width;
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

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (selected) { setSelected(null); return; }
        if (treePillarId) { setTreePillarId(null); return; }
      }
      if (treePillarId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        cyclePillar(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, treePillarId]);

  const resetView = useCallback(() => {
    setTreePillarId(null);
    setSelected(null);
    userViewRef.current = null;
    camTargetRef.current = { x: 0, y: 0, w: dims.w, h: dims.h };
  }, [dims.w, dims.h]);

  const zoomBy = useCallback((factor: number) => {
    lastActiveRef.current = performance.now();
    const svg = svgRef.current;
    if (!svg) return;
    const vb  = svg.viewBox.baseVal;
    const cx  = vb.x + vb.width  / 2;
    const cy  = vb.y + vb.height / 2;
    const nw  = Math.max(dims.w * 0.15, Math.min(dims.w * 3, vb.width  * factor));
    const nh  = nw * (vb.height / vb.width);
    userViewRef.current = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
  }, [dims.w]);

  const cyclePillar = useCallback((dir: number) => {
    setTreePillarId((cur) => {
      if (!cur) return cur;
      const idx    = PILLAR_IDS.indexOf(cur);
      const nextIdx = (idx + dir + PILLAR_IDS.length) % PILLAR_IDS.length;
      return PILLAR_IDS[nextIdx];
    });
    setSelected(null);
  }, []);

  // Derived state
  const inTreeMode = treePillarId !== null;
  const treePillarIndex = treePillarId ? PILLAR_IDS.indexOf(treePillarId) : -1;
  const treePillarLabel = treePillarId
    ? (graph.snodes.find((n) => n.id === treePillarId)?.label ?? treePillarId.toUpperCase())
    : '';

  const isDimmed = (id: string) => {
    if (!highlightSet) return false;
    return !highlightSet.has(id);
  };

  const selectedMeta = selected ? nodeMeta[selected] : null;
  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const focusedColor = treePillarId
    ? (graph.snodes.find((n) => n.id === treePillarId)?.color ?? COLORS.pillar)
    : COLORS.pillar;

  const treeBranches = useMemo(() => {
    if (!treePillarId || !treeLayout) return [];
    const layout = treeLayout;
    const branches: { sx: number; sy: number; tx: number; ty: number; depth: number }[] = [];
    const addBranch = (srcId: string, tgtId: string, depth: number) => {
      const s = layout[srcId];
      const t = layout[tgtId];
      if (s && t) branches.push({ sx: s.x, sy: s.y, tx: t.x, ty: t.y, depth });
    };
    addBranch('core', treePillarId, 1);
    for (const childId of adjacency.down.get(treePillarId) ?? []) {
      if (layout[childId]) {
        addBranch(treePillarId, childId, 2);
        for (const toolId of adjacency.down.get(childId) ?? []) {
          if (layout[toolId]) addBranch(childId, toolId, 3);
        }
      }
    }
    return branches;
  }, [treePillarId, treeLayout, adjacency]);

  return (
    <div ref={wrapRef} className="relative h-screen w-full overflow-hidden font-mono" style={{ background: 'var(--bg)' }}>

      {/* Drifting clean light grid */}
      <div className="kg-grid pointer-events-none absolute inset-0" aria-hidden />

      {/* Subtle radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(255,255,255,0.85) 100%)' }}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onClick={() => {
          if (panSuppressRef.current) { panSuppressRef.current = false; return; }
          if (selected) { setSelected(null); return; }
          if (treePillarId) { setTreePillarId(null); }
        }}
      >
        <defs>
          {/* Radial glow gradients */}
          {Object.entries(COLORS).map(([k, col]) => (
            <radialGradient key={k} id={`glow-${k}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={col} stopOpacity="0.25" />
              <stop offset="65%"  stopColor={col} stopOpacity="0.05" />
              <stop offset="100%" stopColor={col} stopOpacity="0" />
            </radialGradient>
          ))}
          {inTreeMode && (
            <radialGradient id="kg-dept-glow">
              <stop offset="0%"   stopColor={focusedColor} stopOpacity="0.12" />
              <stop offset="60%"  stopColor={focusedColor} stopOpacity="0.03" />
              <stop offset="100%" stopColor={focusedColor} stopOpacity="0" />
            </radialGradient>
          )}
        </defs>

        {/* ── CONCENTRIC ORBITAL RINGS (Matching Reference Image) ──────────── */}
        {!inTreeMode && (
          <g>
            {/* Concentric Guide Circles */}
            {ORBIT_RINGS.map((r) => (
              <circle
                key={`orbit-${r}`}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeDasharray="3 5"
                opacity={0.7}
              />
            ))}

            {/* Faint Radial Sector Rays from Core to Pillars */}
            {PILLAR_IDS.map((pid) => {
              const tgt = orbitTargetPositions[pid];
              if (!tgt) return null;
              return (
                <line
                  key={`ray-${pid}`}
                  x1={cx} y1={cy}
                  x2={tgt.x} y2={tgt.y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
              );
            })}
          </g>
        )}

        {/* ── Focused Tree Overlay ────────────────────────────────────────── */}
        {inTreeMode && (
          <g key={treePillarId ?? 'focus'} style={{ pointerEvents: 'none' }}>
            <circle cx={dims.w / 2} cy={dims.h * 0.5} r={dims.w * 0.52} fill="url(#kg-dept-glow)" className="kg-glow" />

            {TREE_TIERS.map((tier) => (
              <text
                key={tier.label}
                x={24} y={tier.y - 8}
                fill="var(--text-3)"
                fontSize={9}
                letterSpacing="0.22em"
                style={{ textTransform: 'uppercase', userSelect: 'none' }}
              >
                {tier.label}
              </text>
            ))}

            {treeBranches.map((b, i) => {
              const d = branchPath(b.sx, b.sy, b.tx, b.ty);
              if (b.depth === 1) {
                return (
                  <path key={`br-${i}`} d={d} fill="none" stroke="var(--text)" strokeWidth={branchWidth(1)} strokeLinecap="round" pathLength={1} className="kg-grow" />
                );
              }
              if (b.depth === 2) {
                return (
                  <path key={`br-${i}`} d={d} fill="none" stroke="var(--accent)" strokeWidth={branchWidth(2)} strokeLinecap="round" className="kg-dash" />
                );
              }
              return (
                <path key={`br-${i}`} d={d} fill="none" stroke="var(--brain-2)" strokeWidth={branchWidth(3)} strokeLinecap="round" className="kg-fade" />
              );
            })}

            {treeLayout && Object.entries(treeLayout).map(([id, pos]) => {
              const n = graph.snodes.find((m) => m.id === id);
              if (n?.kind !== 'tool') return null;
              return (
                <circle
                  key={`leaf-${id}`}
                  cx={pos.x} cy={pos.y}
                  r={CAT.tool.r + 5}
                  fill="none"
                  stroke="var(--brain-2)"
                  strokeWidth={1}
                  className="kg-leaf"
                />
              );
            })}
          </g>
        )}

        {/* ── Edges / Curved Connectors ─────────────────────────────────────── */}
        {!inTreeMode && (
          <g>
            {graph.simLinks.map((l) => {
              const s = l.source as SimGraphNode;
              const t = l.target as SimGraphNode;
              const dim    = highlightSet ? !(highlightSet.has(s.id) && highlightSet.has(t.id)) : false;
              const incident = hoverId !== null && (s.id === hoverId || t.id === hoverId);
              const onChain  = !highlightSet || (highlightSet.has(s.id) && highlightSet.has(t.id));
              const col      = s.color ?? COLORS[s.kind];
              const arc      = edgeArc(s.x, s.y, t.x, t.y);
              const isPillar = s.kind === 'core' || s.kind === 'pillar';
              return (
                <g key={`l-${l.index}`}>
                  <path
                    d={arc}
                    fill="none"
                    stroke={highlightSet && !dim ? col : '#cbd5e1'}
                    strokeWidth={incident ? 2.0 : onChain && highlightSet ? 1.4 : 1.0}
                    strokeLinecap="round"
                    opacity={highlightSet ? (incident ? 0.85 : onChain ? 0.55 : 0.08) : 0.35}
                  />
                  {isPillar && !highlightSet && (
                    <path
                      d={arc}
                      fill="none"
                      stroke={col}
                      strokeWidth={s.kind === 'core' ? 1.8 : 1.2}
                      strokeLinecap="round"
                      pathLength={1}
                      className={s.kind === 'core' ? 'kg-synapse' : 'kg-synapse-sm'}
                      style={{ ['--kg-syn-delay' as string]: `${(l.index % 7) * -0.7}s` }}
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* ── Nodes (Circular Badges Matching Image) ────────────────────────── */}
        <g>
          {graph.snodes.map((n) => {
            const r   = radiusOf(n);
            const col = n.color ?? COLORS[n.kind];
            const { Icon } = CAT[n.kind] ?? { Icon: Cpu };
            const inTree   = !inTreeMode || (treeNodeIds?.has(n.id) ?? false);
            const dim      = isDimmed(n.id);
            const isHover  = hoverId === n.id;
            const isFocus  = treePillarId === n.id;
            const isSel    = selected === n.id;
            const dimOpacity     = dim ? 0.15 : 1;
            const visibleOpacity = inTree ? dimOpacity : 0;

            const showLabel = n.kind === 'core' || n.kind === 'pillar' || inFocus
              || (hoverId && (highlightSet?.has(n.id) ?? false));
            function inFocus() { return isFocus || (inTreeMode && treeNodeIds?.has(n.id)); }

            // Node colors & badges matching the reference image
            let nodeFill = '#ffffff';
            let strokeCol = col;
            let iconCol = col;

            if (n.kind === 'core') {
              nodeFill = '#0f172a';
              strokeCol = '#334155';
              iconCol = '#ffffff';
            } else if (n.kind === 'tool') {
              // Outer tool ring: red circular badge
              nodeFill = '#ffffff';
              strokeCol = '#e11d48';
              iconCol = '#e11d48';
            } else if (n.kind === 'agent') {
              // Agent ring: white circular badge with dark/colored border
              nodeFill = '#ffffff';
              strokeCol = col;
              iconCol = '#0f172a';
            } else if (n.kind === 'human') {
              nodeFill = '#ffffff';
              strokeCol = '#d97706';
              iconCol = '#d97706';
            } else if (n.kind === 'task') {
              nodeFill = '#ffffff';
              strokeCol = '#94a3b8';
              iconCol = '#64748b';
            } else if (n.kind === 'pillar') {
              nodeFill = '#ffffff';
              strokeCol = col;
              iconCol = col;
            }

            const strokeW =
              n.kind === 'core'   ? 2.6 :
              n.kind === 'pillar' ? 2.4 :
              (isHover || isSel)  ? 2.2 :
              1.6;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                opacity={visibleOpacity}
                style={{
                  cursor: 'pointer',
                  transition: 'opacity 0.3s',
                  pointerEvents: inTree ? 'auto' : 'none',
                }}
                onClick={(e) => { e.stopPropagation(); onNodeClick(n.id); }}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() => setHoverId(null)}
                onPointerDown={(e) => onNodePointerDown(e, n.id)}
                onPointerMove={(e) => onNodePointerMove(e, n.id)}
                onPointerUp={onNodePointerUp}
              >
                {/* Glow halo */}
                <circle
                  r={r * 2.6}
                  fill={`url(#glow-${n.kind})`}
                  opacity={isHover || isFocus ? 1 : 0.35}
                  style={{ transition: 'opacity 0.3s', pointerEvents: 'none' }}
                />

                {/* Selection / Hover ring */}
                {(isHover || isFocus || isSel) && (
                  <circle
                    r={r + (isHover || isFocus ? 9 : 5)}
                    fill="none"
                    stroke={strokeCol}
                    strokeWidth={1.5}
                    strokeOpacity={isSel ? 0.8 : 0.45}
                    strokeDasharray="3 3"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Node body — crisp circular badge */}
                <circle
                  r={r}
                  fill={nodeFill}
                  stroke={strokeCol}
                  strokeWidth={strokeW}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
                />

                {/* Core inner pulse */}
                {n.kind === 'core' && (
                  <circle r={r * 0.35} fill="#38bdf8">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Icon inside circle */}
                <g style={{ color: iconCol, pointerEvents: 'none' }}>
                  <Icon
                    x={-r * 0.6}
                    y={-r * 0.6}
                    width={r * 1.2}
                    height={r * 1.2}
                    strokeWidth={n.kind === 'core' ? 2.2 : 2.0}
                  />
                </g>

                {/* Node Label */}
                {(showLabel || inFocus()) && (
                  <text
                    textAnchor="middle"
                    y={r + 14}
                    fill={n.kind === 'pillar' ? col : 'var(--text)'}
                    fontSize={n.kind === 'core' ? 10.5 : n.kind === 'pillar' ? 10 : 8.5}
                    fontWeight={n.kind === 'core' || n.kind === 'pillar' ? 700 : 500}
                    letterSpacing="0.1em"
                    style={{ textTransform: 'uppercase', userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── HUD — top-left ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-5 top-5 select-none z-10">
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-3)' }}>
          IoT Cyber Defense // Sentinel Core
        </div>
        <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text)' }}>
          IoT Threat Topology
        </div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--ok)' }}>
          <Activity size={11} />
          <span>ARMED / LIVE</span>
        </div>
      </div>

      {/* ── Legend — top-right ───────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute right-5 top-5 select-none z-10"
        style={{
          border: '1px solid var(--border)',
          background: 'rgba(255, 255, 255, 0.90)',
          padding: '10px 14px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'var(--text-3)' }}>
          Node Orbits
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(Object.entries(CAT) as [NodeKind, { Icon: LucideIcon; r: number }][]).map(([k, { Icon }]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-2)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${COLORS[k]}`, background: '#ffffff', color: COLORS[k] }}>
                <Icon size={10} strokeWidth={2} />
              </span>
              {k}
              <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 9 }}>
                {rawNodes.filter((n) => n.kind === k).length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls — bottom-right ──────────────────────────────────────────── */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-2 z-10">
        <CtrlBtn onClick={() => zoomBy(1 / 1.2)}><ZoomIn size={15} /></CtrlBtn>
        <CtrlBtn onClick={() => zoomBy(1.2)}><ZoomOut size={15} /></CtrlBtn>
        <CtrlBtn onClick={resetView}><Maximize size={15} /></CtrlBtn>
      </div>

      {/* ── Hint — bottom-left ───────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute bottom-5 left-5 select-none z-10"
        style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-3)' }}
      >
        {inTreeMode
          ? 'Use chevrons to switch pillars · Click node for details · Esc to go back'
          : 'Drag nodes · Scroll to zoom · Drag canvas to pan · Click a pillar for tree view'}
      </div>

      {/* ── Pillar nav — bottom-center (tree mode) ───────────────────────────── */}
      {inTreeMode && (
        <div
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 z-20"
          style={{
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.94)',
            padding: '6px 12px',
            backdropFilter: 'blur(10px)',
            borderRadius: '9999px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <button
            onClick={() => cyclePillar(-1)}
            className="flex h-9 w-9 items-center justify-center transition-colors"
            style={{ color: 'var(--text-2)', borderRadius: '50%' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col items-center" style={{ minWidth: 130, padding: '0 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: focusedColor }}>
              {treePillarLabel}
            </span>
            <span style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'var(--text-3)' }}>
              {treePillarIndex + 1} / {PILLAR_IDS.length}
            </span>
          </div>
          <button
            onClick={() => cyclePillar(1)}
            className="flex h-9 w-9 items-center justify-center transition-colors"
            style={{ color: 'var(--text-2)', borderRadius: '50%' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronRight size={18} />
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
          <button
            onClick={() => setTreePillarId(null)}
            className="flex items-center gap-1.5 px-2 transition-colors"
            style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <X size={12} /> Exit Tree
          </button>
        </div>
      )}

      {/* ── Focused pillar title — top-center (tree mode) ─────────────────────── */}
      {inTreeMode && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 select-none">
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: focusedColor,
          }}>
            {treePillarLabel}
          </span>
        </div>
      )}

      {/* ── Back button ──────────────────────────────────────────────────────── */}
      {(inTreeMode || selected) && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <button
            onClick={() => { setTreePillarId(null); setSelected(null); userViewRef.current = null; }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.92)',
              padding: '6px 12px',
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--text-2)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      )}

      {/* ── Detail panel — node info ──────────────────────────────────────────── */}
      {selectedMeta && (
        <div
          className="kg-panel absolute left-4 z-20 w-72 overflow-hidden"
          style={{
            top: 60,
            border: '1px solid var(--border-strong)',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          }}
        >
          {/* Top bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            padding: '10px 14px',
            background: 'var(--surface-2)',
          }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'var(--text-3)' }}>
                {selectedMeta.kind}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text)' }}>
                {selectedMeta.label}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ color: 'var(--text-3)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 7, height: 7,
                  borderRadius: '50%',
                  background: colorOf(selectedMeta.kind as NodeKind),
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-2)' }}>
                {selectedMeta.status}
              </span>
            </div>

            <p style={{ fontSize: 11, lineHeight: 1.6, letterSpacing: '0.02em', color: 'var(--text-2)' }}>
              {selectedMeta.detail}
            </p>

            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'var(--text-3)', marginBottom: 6 }}>
                Connections
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {graph.simLinks
                  .filter((l) => (l.source as SimGraphNode).id === selectedMeta.id || (l.target as SimGraphNode).id === selectedMeta.id)
                  .map((l) => {
                    const s     = l.source as SimGraphNode;
                    const t     = l.target as SimGraphNode;
                    const other = s.id === selectedMeta.id ? t : s;
                    return (
                      <span
                        key={l.index}
                        style={{
                          border: '1px solid var(--border)',
                          background: 'var(--surface-2)',
                          padding: '3px 8px',
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: colorOf(other.kind),
                          cursor: 'pointer',
                        }}
                        onClick={() => { setSelected(other.id); }}
                      >
                        {other.label}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        width: 38, height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.92)',
        color: 'var(--text-2)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text)';
        e.currentTarget.style.borderColor = 'var(--text-3)';
        e.currentTarget.style.background = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-2)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)';
      }}
    >
      {children}
    </button>
  );
}
