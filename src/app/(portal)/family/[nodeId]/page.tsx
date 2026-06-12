import { notFound } from "next/navigation";
import {
  requireCapability,
  getCurrentAppUser,
  getCurrentCapabilities,
} from "@/lib/current-user";
import { componentOf, familyName } from "@/lib/family";
import { loadFamilyGraph } from "@/lib/family-data";
import { layoutFamily, PARTNER_HANDLE_TOP } from "@/lib/family-tree-layout";
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
  for (const [child, parents] of childParents) {
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
      edges.push({
        id: `drop-${child}`,
        kind: "drop",
        source: left,
        target: child,
        dx,
        unionY: pos.get(left)!.y + PARTNER_HANDLE_TOP,
      });
    } else {
      for (const p of parents) {
        edges.push({
          id: `drop-${child}-${p}`,
          kind: "drop",
          source: p,
          target: child,
          dx: 0,
        });
      }
    }
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
