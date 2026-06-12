// Pure family-graph logic. No supabase imports — keep this file unit-testable.
// Stored facts are only parent/partner links; everything else is derived here.

export type FamilyNode = {
  id: string;
  appUserId: string | null; // null => placeholder
  name: string; // member name or placeholder display_name, resolved by the loader
  avatarUrl: string | null;
  lotNumber: string | null;
  birthYear: number | null;
  deathYear: number | null;
  gender: "m" | "f" | null;
  // custom title for this person's family component, set on at most one node
  familyNameOverride: string | null;
  dogs: string[];
};

export type FamilyLink = {
  id: string;
  type: "parent" | "partner";
  fromNode: string; // parent links: from = parent, to = child
  toNode: string;
};

export type FamilyGraph = {
  nodes: Map<string, FamilyNode>;
  links: FamilyLink[];
  // precomputed indexes
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  partners: Map<string, string[]>;
};

export function buildGraph(
  nodes: FamilyNode[],
  links: FamilyLink[],
): FamilyGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const partners = new Map<string, string[]>();

  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const arr = m.get(k);
    if (arr) {
      if (!arr.includes(v)) arr.push(v);
    } else m.set(k, [v]);
  };

  for (const l of links) {
    if (!nodeMap.has(l.fromNode) || !nodeMap.has(l.toNode)) continue;
    if (l.type === "parent") {
      push(parents, l.toNode, l.fromNode);
      push(children, l.fromNode, l.toNode);
    } else {
      push(partners, l.fromNode, l.toNode);
      push(partners, l.toNode, l.fromNode);
    }
  }
  return { nodes: nodeMap, links, parents, children, partners };
}

const byName = (g: FamilyGraph) => (a: string, b: string) =>
  (g.nodes.get(a)?.name ?? "").localeCompare(g.nodes.get(b)?.name ?? "");

export function parentsOf(g: FamilyGraph, id: string): string[] {
  return [...(g.parents.get(id) ?? [])].sort(byName(g));
}

export function childrenOf(g: FamilyGraph, id: string): string[] {
  // birth year first (known years before unknown), then name
  return [...(g.children.get(id) ?? [])].sort((a, b) => {
    const ya = g.nodes.get(a)?.birthYear;
    const yb = g.nodes.get(b)?.birthYear;
    if (ya != null && yb != null && ya !== yb) return ya - yb;
    if (ya != null && yb == null) return -1;
    if (ya == null && yb != null) return 1;
    return byName(g)(a, b);
  });
}

export function partnersOf(g: FamilyGraph, id: string): string[] {
  return [...(g.partners.get(id) ?? [])].sort(byName(g));
}

export function siblingsOf(g: FamilyGraph, id: string): string[] {
  const sibs = new Set<string>();
  for (const p of g.parents.get(id) ?? []) {
    for (const c of g.children.get(p) ?? []) {
      if (c !== id) sibs.add(c);
    }
  }
  return [...sibs].sort(byName(g));
}

export function componentOf(g: FamilyGraph, id: string): Set<string> {
  const seen = new Set<string>();
  if (!g.nodes.has(id)) return seen;
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of [
      ...(g.parents.get(cur) ?? []),
      ...(g.children.get(cur) ?? []),
      ...(g.partners.get(cur) ?? []),
    ]) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

export function familyName(g: FamilyGraph, component: Set<string>): string {
  // an explicit override on any component node wins; if more than one node
  // somehow carries one, pick deterministically by lowest node id. The user's
  // text is the whole title — no " family" suffix.
  const overrides = [...component]
    .filter((id) => (g.nodes.get(id)?.familyNameOverride ?? "").trim() !== "")
    .sort();
  if (overrides.length) {
    return g.nodes.get(overrides[0])!.familyNameOverride!.trim();
  }

  const count = (ids: string[]) => {
    const counts = new Map<string, number>();
    for (const id of ids) {
      const node = g.nodes.get(id);
      if (!node) continue;
      const last = node.name.trim().split(/\s+/).slice(-1)[0];
      if (!last) continue;
      counts.set(last, (counts.get(last) ?? 0) + 1);
    }
    return counts;
  };

  // prefer member surnames; placeholders like "Grandpa Joe" would pollute
  const members = [...component].filter((id) => g.nodes.get(id)?.appUserId);
  let counts = count(members);
  if (counts.size === 0) counts = count([...component]);

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([name]) => name);
  return top.length ? `${top.join(" / ")} family` : "Family";
}

// Adding a parent link parent->child is illegal if child is already an
// ancestor of parent (or they're the same node).
export function wouldCreateCycle(
  g: FamilyGraph,
  parentId: string,
  childId: string,
): boolean {
  if (parentId === childId) return true;
  const seen = new Set<string>();
  const stack = [parentId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === childId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of g.parents.get(cur) ?? []) stack.push(p);
  }
  return false;
}

export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Placeholder nodes in the anchor's component whose name matches `name`
// (after normalization). Used to offer "did you mean this person?" before
// creating yet another Grandpa Joe.
export function sameNamePlaceholdersIn(
  g: FamilyGraph,
  anchorNodeId: string,
  name: string,
): string[] {
  const target = normalizeName(name);
  if (!target) return [];
  const out: string[] = [];
  for (const id of componentOf(g, anchorNodeId)) {
    const node = g.nodes.get(id);
    if (!node || node.appUserId) continue;
    if (normalizeName(node.name) === target) out.push(id);
  }
  return out;
}

// Placeholders in the anchor's component that look like they stand in for a
// member named `memberFullName`. exact = full-name equality, partial = the
// placeholder is just the member's first name ("Nadia" vs "Nadia Whitfield").
// Partial matches are prompted about rather than auto-merged.
export function placeholderMatchesForMember(
  g: FamilyGraph,
  anchorNodeId: string,
  memberFullName: string,
): { exact: string[]; partial: string[] } {
  const exact = sameNamePlaceholdersIn(g, anchorNodeId, memberFullName);
  const firstName = normalizeName(memberFullName).split(" ")[0] ?? "";
  const partial = firstName
    ? sameNamePlaceholdersIn(g, anchorNodeId, firstName).filter(
        (id) => !exact.includes(id),
      )
    : [];
  return { exact, partial };
}

// Placeholder ids already sitting in the slot a new (relationship, base)
// link would fill. Shared by the link-candidates fetch and the merge guards
// in the add-relative actions so the two can't drift.
export function slotPlaceholderIds(
  g: FamilyGraph,
  relationship: "parent" | "partner" | "child",
  baseNodeId: string,
): string[] {
  const slot =
    relationship === "parent"
      ? (g.parents.get(baseNodeId) ?? [])
      : relationship === "child"
        ? (g.children.get(baseNodeId) ?? [])
        : (g.partners.get(baseNodeId) ?? []);
  return slot.filter((id) => !g.nodes.get(id)?.appUserId);
}

const YEAR_MIN = 1850;

export function validateYears(
  birthYear: number | null,
  deathYear: number | null,
): string | null {
  const max = new Date().getFullYear() + 1;
  for (const y of [birthYear, deathYear]) {
    // NaN (e.g. Number("19x5") from free-text inputs) fails every comparison,
    // so guard for it explicitly
    if (y != null && (Number.isNaN(y) || y < YEAR_MIN || y > max)) {
      return `Years must be between ${YEAR_MIN} and ${max}`;
    }
  }
  if (birthYear != null && deathYear != null && deathYear < birthYear) {
    return "Death year cannot be before birth year";
  }
  return null;
}

// --- relationship labeling ---
// Shortest path over typed moves: P (to parent), C (to child), S (to partner).
// The move string describes B's position relative to A, e.g. "PPC" = parent's
// sibling. Tie-breaks: P, then C, then S — so blood paths beat partner hops.

type Move = "P" | "C" | "S";
const MOVE_ORDER: Record<Move, number> = { P: 0, C: 1, S: 2 };

type Adjacency = Map<string, Array<{ to: string; move: Move }>>;

// Cached per graph: the directory labels every member's relation to the viewer,
// so pathBetween runs ~N times against the same immutable graph — build the
// adjacency once. WeakMap keys on the graph object, so it's GC'd with it.
const adjacencyCache = new WeakMap<FamilyGraph, Adjacency>();

function adjacency(g: FamilyGraph): Adjacency {
  const cached = adjacencyCache.get(g);
  if (cached) return cached;

  const adj: Adjacency = new Map();
  const add = (from: string, to: string, move: Move) => {
    const arr = adj.get(from);
    if (arr) arr.push({ to, move });
    else adj.set(from, [{ to, move }]);
  };
  for (const [child, ps] of g.parents) for (const p of ps) add(child, p, "P");
  for (const [parent, cs] of g.children)
    for (const c of cs) add(parent, c, "C");
  for (const [a, bs] of g.partners) for (const b of bs) add(a, b, "S");
  for (const arr of adj.values()) {
    arr.sort(
      (x, y) =>
        MOVE_ORDER[x.move] - MOVE_ORDER[y.move] || x.to.localeCompare(y.to),
    );
  }
  adjacencyCache.set(g, adj);
  return adj;
}

export function pathBetween(
  g: FamilyGraph,
  a: string,
  b: string,
  maxDepth = 8,
): string | null {
  if (a === b) return "";
  const adj = adjacency(g);
  const visited = new Set([a]);
  let frontier: Array<{ id: string; path: string }> = [{ id: a, path: "" }];
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: typeof frontier = [];
    for (const { id, path } of frontier) {
      for (const edge of adj.get(id) ?? []) {
        if (visited.has(edge.to)) continue;
        const p = path + edge.move;
        if (edge.to === b) return p;
        visited.add(edge.to);
        next.push({ id: edge.to, path: p });
      }
    }
    if (next.length === 0) return null;
    frontier = next;
  }
  return null;
}

const great = (n: number) => "great-".repeat(n);

function gendered(
  gender: "m" | "f" | null,
  m: string,
  f: string,
  neutral: string,
): string {
  return gender === "m" ? m : gender === "f" ? f : neutral;
}

export function relationshipLabel(
  path: string,
  gender: "m" | "f" | null,
): string {
  if (path === "S") return "partner";
  if (path === "PSC")
    return gendered(gender, "stepbrother", "stepsister", "step-sibling");

  const m = path.match(/^(S?)(P*)(C*)(S?)$/);
  if (!m) return "relative";
  const [, sPre, ps, cs, sPost] = m;
  const up = ps.length;
  const down = cs.length;
  if (sPre && sPost) return "relative";

  if (sPre) {
    // partner's relative
    if (up === 1 && down === 0)
      return gendered(
        gender,
        "father-in-law",
        "mother-in-law",
        "parent-in-law",
      );
    if (up === 1 && down === 1)
      return gendered(
        gender,
        "brother-in-law",
        "sister-in-law",
        "sibling-in-law",
      );
    if (up === 0 && down === 1)
      return gendered(gender, "stepson", "stepdaughter", "stepchild");
    return "relative";
  }
  if (sPost) {
    // relative's partner
    if (up === 1 && down === 0)
      return gendered(gender, "stepfather", "stepmother", "step-parent");
    if (up === 1 && down === 1)
      return gendered(
        gender,
        "brother-in-law",
        "sister-in-law",
        "sibling-in-law",
      );
    if (up === 0 && down === 1)
      return gendered(gender, "son-in-law", "daughter-in-law", "child-in-law");
    return "relative";
  }

  if (up > 0 && down === 0) {
    if (up === 1) return gendered(gender, "father", "mother", "parent");
    return (
      great(up - 2) +
      gendered(gender, "grandfather", "grandmother", "grandparent")
    );
  }
  if (down > 0 && up === 0) {
    if (down === 1) return gendered(gender, "son", "daughter", "child");
    return (
      great(down - 2) +
      gendered(gender, "grandson", "granddaughter", "grandchild")
    );
  }
  if (up === 1 && down === 1)
    return gendered(gender, "brother", "sister", "sibling");
  if (up >= 2 && down >= 2) {
    if (up === 2 && down === 2) return "cousin";
    if (up === 3 && down === 3) return "second cousin";
    return "cousin";
  }
  if (down === 1) {
    // up >= 2
    if (up === 2) return gendered(gender, "uncle", "aunt", "aunt/uncle");
    if (up === 3)
      return gendered(gender, "great-uncle", "great-aunt", "great-aunt/uncle");
    return "relative";
  }
  if (up === 1) {
    // down >= 2
    if (down === 2) return gendered(gender, "nephew", "niece", "niece/nephew");
    if (down === 3)
      return gendered(
        gender,
        "great-nephew",
        "great-niece",
        "great-niece/nephew",
      );
    return "relative";
  }
  return "relative";
}

// Label of b relative to a, or null if same node / unconnected / too distant.
export function relationshipBetween(
  g: FamilyGraph,
  a: string,
  b: string,
): string | null {
  if (a === b) return null;
  const path = pathBetween(g, a, b);
  if (!path) return null;
  return relationshipLabel(path, g.nodes.get(b)?.gender ?? null);
}
