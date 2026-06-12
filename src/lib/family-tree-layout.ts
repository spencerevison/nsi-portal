// Generational layout for one family component. Pure function so the server
// page can compute positions and the client just renders them.
//
// Approach: longest-path depth per node, partners pulled onto the same row,
// couples grouped into "units" placed left-to-right, each unit centered under
// the average x of its members' parents when possible. Good enough for the
// 10-40 node trees this community produces; not a general DAG renderer.

import type { FamilyLink } from "@/lib/family";

export const CARD_W = 180;
export const CARD_H = 96;
export const GAP_X = 28;
export const ROW_H = 170;

// Where partner edges attach (px below a card's top) and where the couple's
// union dot / child trunk begins. Lives here (not in the client component) so
// the server page can import it without crossing the use-client boundary,
// which turns the value into a stub reference. Lines up with the avatar row:
// p-2 (8px) + half the size-8 (32px) avatar.
export const PARTNER_HANDLE_TOP = 24;

export type PlacedNode = { id: string; x: number; y: number };

export function layoutFamily(
  nodeIds: string[],
  links: FamilyLink[],
): { nodes: PlacedNode[]; width: number; height: number } {
  const ids = new Set(nodeIds);
  const parents = new Map<string, string[]>();
  const partners = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    m.set(k, [...(m.get(k) ?? []), v]);
  };
  for (const l of links) {
    if (!ids.has(l.fromNode) || !ids.has(l.toNode)) continue;
    if (l.type === "parent") {
      push(parents, l.toNode, l.fromNode);
    } else {
      push(partners, l.fromNode, l.toNode);
      push(partners, l.toNode, l.fromNode);
    }
  }

  // 1. depth = longest path from a root (node without parents)
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  function depthOf(id: string): number {
    const known = depth.get(id);
    if (known != null) return known;
    if (visiting.has(id)) return 0; // server enforces acyclic; just don't hang
    visiting.add(id);
    const ps = parents.get(id) ?? [];
    const d = ps.length ? Math.max(...ps.map(depthOf)) + 1 : 0;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }
  for (const id of nodeIds) depthOf(id);

  // 2. partners share a row; children sit below their deepest parent.
  //    a few passes settle it for any realistic family
  for (let pass = 0; pass < 4; pass++) {
    for (const [a, bs] of partners) {
      for (const b of bs) {
        const d = Math.max(depth.get(a)!, depth.get(b)!);
        depth.set(a, d);
        depth.set(b, d);
      }
    }
    for (const id of nodeIds) {
      const ps = parents.get(id) ?? [];
      if (ps.length) {
        const d = Math.max(...ps.map((p) => depth.get(p)!)) + 1;
        if (d > depth.get(id)!) depth.set(id, d);
      }
    }
  }

  // 3. units: connected partner groups on the same row (usually pairs)
  const unitOf = new Map<string, string[]>();
  const sortedIds = [...nodeIds].sort();
  for (const id of sortedIds) {
    if (unitOf.has(id)) continue;
    const unit = [id];
    unitOf.set(id, unit);
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const p of partners.get(cur) ?? []) {
        if (!unitOf.has(p) && depth.get(p) === depth.get(id)) {
          unitOf.set(p, unit);
          unit.push(p);
          queue.push(p);
        }
      }
    }
    unit.sort();
  }
  const units = [...new Set(unitOf.values())];

  // 4. place rows top to bottom
  const x = new Map<string, number>();
  const maxDepth = Math.max(...[...depth.values()], 0);
  for (let row = 0; row <= maxDepth; row++) {
    const rowUnits = units.filter((u) => depth.get(u[0]) === row);
    const slotW = CARD_W + GAP_X;
    const desired = (u: string[]): number | null => {
      const px: number[] = [];
      for (const member of u) {
        for (const p of parents.get(member) ?? []) {
          const v = x.get(p);
          if (v != null) px.push(v + CARD_W / 2);
        }
      }
      if (!px.length) return null;
      const mid = px.reduce((a, b) => a + b, 0) / px.length;
      return mid - (u.length * slotW - GAP_X) / 2;
    };
    rowUnits.sort((a, b) => {
      const da = desired(a);
      const db = desired(b);
      if (da != null && db != null && da !== db) return da - db;
      if (da != null && db == null) return -1;
      if (da == null && db != null) return 1;
      return a[0].localeCompare(b[0]);
    });
    let cursor = 0;
    for (const u of rowUnits) {
      const start = Math.max(cursor, desired(u) ?? cursor);
      u.forEach((member, i) => x.set(member, start + i * slotW));
      cursor = start + u.length * slotW + GAP_X;
    }
  }

  // normalize to start at 0
  const minX = Math.min(...[...x.values()], 0);
  const nodes: PlacedNode[] = sortedIds.map((id) => ({
    id,
    x: x.get(id)! - minX,
    y: depth.get(id)! * ROW_H,
  }));
  const width = Math.max(...nodes.map((p) => p.x)) + CARD_W;
  const height = maxDepth * ROW_H + CARD_H;
  return { nodes, width, height };
}
