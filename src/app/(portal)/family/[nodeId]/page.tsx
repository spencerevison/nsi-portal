import { notFound } from "next/navigation";
import {
  requireCapability,
  getCurrentAppUser,
  getCurrentCapabilities,
} from "@/lib/current-user";
import { componentOf, familyName } from "@/lib/family";
import { loadFamilyGraph } from "@/lib/family-data";
import {
  layoutFamily,
  PARTNER_HANDLE_TOP,
  CARD_W,
  CARD_H,
} from "@/lib/family-tree-layout";
import { FamilyTree, type TreeCard, type TreeEdge } from "./family-tree";
import { FamilyTitle } from "./family-title";

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  await requireCapability("directory.read");
  const { nodeId } = await params;

  const g = await loadFamilyGraph();
  if (!g.nodes.has(nodeId)) notFound();

  const viewer = await getCurrentAppUser();
  const caps = await getCurrentCapabilities();
  const component = componentOf(g, nodeId);
  const ids = [...component];

  const isOverride = ids.some(
    (id) => (g.nodes.get(id)?.familyNameOverride ?? "").trim() !== "",
  );
  const viewerInComponent =
    viewer != null &&
    ids.some((id) => g.nodes.get(id)?.appUserId === viewer.id);
  const canEdit =
    viewer != null && (caps.has("admin.access") || viewerInComponent);
  const links = g.links.filter(
    (l) => component.has(l.fromNode) && component.has(l.toNode),
  );

  const layout = layoutFamily(ids, links);
  const pos = new Map(layout.nodes.map((p) => [p.id, p]));

  const cards: TreeCard[] = layout.nodes.map((p) => {
    const n = g.nodes.get(p.id)!;
    return {
      id: p.id,
      x: p.x,
      y: p.y,
      name: n.name,
      userId: n.appUserId,
      avatarUrl: n.avatarUrl,
      lotNumber: n.lotNumber,
      birthYear: n.birthYear,
      deathYear: n.deathYear,
      dogs: n.dogs,
      isViewer: viewer != null && n.appUserId === viewer.id,
    };
  });

  // Edges. For a child whose two parents are adjacent partners we draw ONE
  // line from the couple midpoint (left parent + dx); otherwise per-parent.
  const partnerSet = new Set(
    links
      .filter((l) => l.type === "partner")
      .map((l) => `${l.fromNode}|${l.toNode}`),
  );
  const arePartners = (a: string, b: string) =>
    partnerSet.has(`${a}|${b}`) || partnerSet.has(`${b}|${a}`);

  const childParents = new Map<string, string[]>();
  for (const l of links) {
    if (l.type !== "parent") continue;
    childParents.set(l.toNode, [
      ...(childParents.get(l.toNode) ?? []),
      l.fromNode,
    ]);
  }

  // Build the parent->child drops first so we know which couples share kids —
  // those get a union dot on their partner line.
  const edges: TreeEdge[] = [];
  const couplesWithKids = new Set<string>();

  // x of a card's bottom/top handle (handles sit centered on the card)
  const cx = (id: string) => pos.get(id)!.x + CARD_W / 2;

  // Collect drops with the geometry we need to stagger their bus lines. Each
  // sibship (a couple, or a single parent) owns one horizontal "bus"; we give
  // overlapping sibships distinct heights so their lines don't merge.
  type DropMeta = {
    edge: TreeEdge;
    rowY: number;
    group: string;
    lo: number;
    hi: number;
  };
  const drops: DropMeta[] = [];

  for (const [child, parents] of childParents) {
    const childX = cx(child);
    if (
      parents.length === 2 &&
      arePartners(parents[0], parents[1]) &&
      pos.get(parents[0])!.y === pos.get(parents[1])!.y
    ) {
      const [left, right] =
        pos.get(parents[0])!.x <= pos.get(parents[1])!.x
          ? [parents[0], parents[1]]
          : [parents[1], parents[0]];
      couplesWithKids.add(`${left}|${right}`);
      const dx = (pos.get(right)!.x - pos.get(left)!.x) / 2;
      const trunkX = cx(left) + dx;
      drops.push({
        edge: {
          id: `drop-${child}`,
          kind: "drop",
          source: left,
          target: child,
          dx,
          unionY: pos.get(left)!.y + PARTNER_HANDLE_TOP,
        },
        rowY: pos.get(left)!.y,
        group: `${left}|${right}`,
        lo: Math.min(trunkX, childX),
        hi: Math.max(trunkX, childX),
      });
    } else {
      for (const p of parents) {
        const trunkX = cx(p);
        drops.push({
          edge: {
            id: `drop-${child}-${p}`,
            kind: "drop",
            source: p,
            target: child,
            dx: 0,
          },
          rowY: pos.get(p)!.y,
          group: p,
          lo: Math.min(trunkX, childX),
          hi: Math.max(trunkX, childX),
        });
      }
    }
  }

  // One bus per sibship; merge each sibship's children into a single x-span.
  const spans = new Map<string, { rowY: number; x0: number; x1: number }>();
  for (const d of drops) {
    const s = spans.get(d.group);
    if (!s) spans.set(d.group, { rowY: d.rowY, x0: d.lo, x1: d.hi });
    else {
      s.x0 = Math.min(s.x0, d.lo);
      s.x1 = Math.max(s.x1, d.hi);
    }
  }

  // Greedy interval colouring per parent-row: sibships whose x-spans overlap
  // get different levels, so their horizontal lines never sit on the same Y.
  const level = new Map<string, number>();
  const rows = new Map<number, string[]>();
  for (const [key, s] of spans) {
    rows.set(s.rowY, [...(rows.get(s.rowY) ?? []), key]);
  }
  for (const keys of rows.values()) {
    keys.sort((a, b) => spans.get(a)!.x0 - spans.get(b)!.x0);
    const ends: number[] = []; // rightmost x1 placed on each level so far
    for (const k of keys) {
      const s = spans.get(k)!;
      let lvl = ends.findIndex((e) => e < s.x0 - 0.5);
      if (lvl === -1) {
        lvl = ends.length;
        ends.push(s.x1);
      } else {
        ends[lvl] = s.x1;
      }
      level.set(k, lvl);
    }
  }

  // Drop the bus into the gap below the parent row, one step per level.
  const BUS_BASE = 28; // px below the card bottom for the first sibship
  const BUS_STEP = 16; // extra drop per overlapping sibship
  for (const d of drops) {
    d.edge.busY =
      d.rowY + CARD_H + BUS_BASE + (level.get(d.group) ?? 0) * BUS_STEP;
    edges.push(d.edge);
  }

  for (const l of links) {
    if (l.type !== "partner") continue;
    const [left, right] =
      pos.get(l.fromNode)!.x <= pos.get(l.toNode)!.x
        ? [l.fromNode, l.toNode]
        : [l.toNode, l.fromNode];
    edges.push({
      id: `partner-${l.id}`,
      kind: "partner",
      source: left,
      target: right,
      hasChildren: couplesWithKids.has(`${left}|${right}`),
    });
  }

  const generations = new Set(layout.nodes.map((p) => p.y)).size;
  const title = familyName(g, component);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <FamilyTitle
          nodeId={nodeId}
          name={title}
          isOverride={isOverride}
          canEdit={canEdit}
        />
        <p className="text-muted-foreground text-sm">
          {ids.length} {ids.length === 1 ? "person" : "people"} across{" "}
          {generations} {generations === 1 ? "generation" : "generations"}
        </p>
      </div>
      <FamilyTree cards={cards} edges={edges} />
    </div>
  );
}
