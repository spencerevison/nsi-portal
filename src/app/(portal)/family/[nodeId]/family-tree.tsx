"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BaseEdge,
  Handle,
  Position,
  ReactFlow,
  type EdgeProps,
  type Node,
  type NodeProps,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { CARD_W, PARTNER_HANDLE_TOP } from "@/lib/family-tree-layout";

export type TreeCard = {
  id: string;
  x: number;
  y: number;
  name: string;
  userId: string | null;
  avatarUrl: string | null;
  lotNumber: string | null;
  birthYear: number | null;
  deathYear: number | null;
  dogs: string[];
  isViewer: boolean;
};

export type TreeEdge = {
  id: string;
  kind: "partner" | "drop";
  source: string;
  target: string;
  dx?: number;
  // partner edges: whether this couple has shared children (draws the union dot)
  hasChildren?: boolean;
  // couple drop edges: absolute Y of the union dot so the trunk starts there
  unionY?: number;
};

type PersonNode = Node<{ card: TreeCard }, "person">;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function PersonCard({ data }: NodeProps<PersonNode>) {
  const c = data.card;
  const placeholder = c.userId === null;
  const years =
    c.deathYear != null
      ? `${c.birthYear ?? "?"}–${c.deathYear}`
      : c.birthYear != null
        ? `b. ${c.birthYear}`
        : null;

  return (
    <div
      style={{ width: CARD_W }}
      className={cn(
        "bg-card rounded-lg border p-2 shadow-sm",
        placeholder && "border-dashed opacity-75",
        c.isViewer && "ring-primary ring-2",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="t"
        className="!size-0 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="!size-0 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        style={{ top: PARTNER_HANDLE_TOP }}
        className="!size-0 !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="l"
        style={{ top: PARTNER_HANDLE_TOP }}
        className="!size-0 !opacity-0"
      />
      <div className="flex items-center gap-2">
        {c.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.avatarUrl}
            alt={c.name}
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
              placeholder
                ? "bg-muted text-muted-foreground"
                : "bg-accent-600 text-accent-50",
            )}
          >
            {initials(c.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {[c.lotNumber ? `Lot ${c.lotNumber}` : null, years]
              .filter(Boolean)
              .join(" · ") || (placeholder ? "non-member" : "")}
          </p>
        </div>
      </div>
      {c.dogs.length > 0 && (
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {c.dogs.join(", ")}
        </p>
      )}
    </div>
  );
}

// parent->child edge. dx shifts the start to a couple's midpoint. We route it
// by hand (down to a shared bus line, across, then down to the child) instead
// of getSmoothStepPath: every child of the same parents shares one bus Y, so
// the trunk and the horizontal bus join cleanly with no gaps — react-flow's
// smoothstep degenerates to a plain vertical for a child sitting under the
// trunk, which broke the bus.
function DropEdge({ sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const dx = (data?.dx as number | undefined) ?? 0;
  const unionY = data?.unionY as number | undefined;
  const sx = sourceX + dx;
  // for couples the trunk starts at the union dot (up on the partner line);
  // the bus stays below the cards, so keep it referenced to the card bottom.
  const startY = unionY ?? sourceY;
  const busY = sourceY + (targetY - sourceY) / 2;
  const dist = Math.abs(targetX - sx);

  let path: string;
  if (dist < 1) {
    // child sits directly under the trunk — straight drop
    path = `M ${sx},${startY} L ${targetX},${targetY}`;
  } else {
    const sign = targetX > sx ? 1 : -1;
    const r = Math.min(
      8,
      dist / 2,
      Math.abs(busY - sourceY),
      Math.abs(targetY - busY),
    );
    path = [
      `M ${sx},${startY}`,
      `L ${sx},${busY - r}`,
      `Q ${sx},${busY} ${sx + sign * r},${busY}`,
      `L ${targetX - sign * r},${busY}`,
      `Q ${targetX},${busY} ${targetX},${busY + r}`,
      `L ${targetX},${targetY}`,
    ].join(" ");
  }
  return <BaseEdge path={path} />;
}

// partners sit on the same row; force a flat horizontal line between them
// (handles are pinned to the same offset, but clamp to one Y to be safe).
// When the couple has kids, drop a small "union" ring at the midpoint — the
// children's trunk starts here, the way genealogy tools mark a couple.
function PartnerEdge({ sourceX, sourceY, targetX, data }: EdgeProps) {
  const midX = (sourceX + targetX) / 2;
  return (
    <>
      <BaseEdge path={`M ${sourceX},${sourceY} L ${targetX},${sourceY}`} />
      {(data?.hasChildren as boolean | undefined) && (
        <circle
          cx={midX}
          cy={sourceY}
          r={4.5}
          style={{
            fill: "var(--color-card)",
            stroke: "var(--color-muted-foreground)",
            strokeWidth: 1.5,
          }}
        />
      )}
    </>
  );
}

const nodeTypes = { person: PersonCard };
const edgeTypes = { drop: DropEdge, partner: PartnerEdge };

export function FamilyTree({
  cards,
  edges,
}: {
  cards: TreeCard[];
  edges: TreeEdge[];
}) {
  const router = useRouter();

  const rfNodes: PersonNode[] = useMemo(
    () =>
      cards.map((c) => ({
        id: c.id,
        type: "person" as const,
        position: { x: c.x, y: c.y },
        data: { card: c },
        draggable: false,
        connectable: false,
      })),
    [cards],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) =>
        e.kind === "partner"
          ? {
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: "r",
              targetHandle: "l",
              type: "partner",
              data: { hasChildren: e.hasChildren ?? false },
            }
          : {
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: "b",
              targetHandle: "t",
              type: "drop",
              data: { dx: e.dx ?? 0, unionY: e.unionY },
            },
      ),
    [edges],
  );

  return (
    <div className="bg-muted/30 min-h-0 flex-1 rounded-lg border">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={(_, node) => {
          const card = (node.data as { card: TreeCard }).card;
          if (card.userId) router.push(`/directory?member=${card.userId}`);
        }}
      >
        <Background gap={24} />
      </ReactFlow>
    </div>
  );
}
