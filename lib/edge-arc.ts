/**
 * edgeArc — returns a quadratic bezier SVG path with a slight perpendicular bow.
 * The bow scales with 12% of edge length, matching the FounderOS KnowledgeGraph
 * aesthetic: edges gently curve away from straight lines so the graph reads as
 * an organic network rather than a rigid diagram.
 *
 * @param sx source x
 * @param sy source y
 * @param tx target x
 * @param ty target y
 * @returns SVG path `d` string
 */
export function edgeArc(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular unit vector — the bow swings to the left of the direction of travel
  const ux = -dy / len;
  const uy =  dx / len;
  const bow = len * 0.12;
  const mx = (sx + tx) / 2 + ux * bow;
  const my = (sy + ty) / 2 + uy * bow;
  return `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;
}
